import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { degrees, PDFDocument, type PDFImage } from 'pdf-lib';

import { DocumentService } from './document.service';
import { StorageService } from '../../storage/services/storage.service';
import type { DocumentEntity } from '../entities';

/** A4 in PDF points, and the white border kept around a photo. */
const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 24;

export const MAX_PRINT_DOCUMENTS = 50;
/** Total file size one print job may read: the output PDF is about as big, and the server has 1 GB. */
const MAX_PRINT_BYTES = 150 * 1024 * 1024;

/** Files read from storage together; at 20 MB each this stays well inside memory. */
const READ_AHEAD = 4;

const PRINTABLE_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);

/** False only when the stored type says it cannot print; an unknown type is checked by its bytes. */
function mayPrint(doc: DocumentEntity): boolean {
  return !doc.mimeType || PRINTABLE_MIME.has(doc.mimeType);
}

function unsupportedError(fileNames: string[]): BadRequestException {
  return new BadRequestException(
    `Only PDFs and JPG or PNG photos can be printed: ${fileNames.join(', ')}`,
  );
}

function tooLargeError(): BadRequestException {
  return new BadRequestException(
    'These files are too large to print together (over 150 MB). Print fewer at a time.',
  );
}

type Kind = 'pdf' | 'jpg' | 'png';

/** From the file's first bytes: `mime_type` is empty on older rows and names can lie. */
function kindOf(bytes: Buffer): Kind | null {
  if (bytes.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return 'png';
  return null;
}

/**
 * The EXIF orientation of a JPEG (1 when absent). Phone cameras store a photo
 * sideways and set this flag instead of turning the pixels; pdf-lib ignores
 * it, so without this a portrait site photo prints on its side.
 */
function jpegOrientation(bytes: Buffer): number {
  try {
    return readJpegOrientation(bytes);
  } catch {
    return 1; // a malformed EXIF block: print the photo as stored
  }
}

function readJpegOrientation(bytes: Buffer): number {
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) return 1;
    const marker = bytes[offset + 1]!;
    const size = bytes.readUInt16BE(offset + 2);
    if (marker === 0xe1 && bytes.subarray(offset + 4, offset + 8).toString('latin1') === 'Exif') {
      const tiff = offset + 10;
      const little = bytes.subarray(tiff, tiff + 2).toString('latin1') === 'II';
      const u16 = (at: number): number =>
        little ? bytes.readUInt16LE(at) : bytes.readUInt16BE(at);
      const u32 = (at: number): number =>
        little ? bytes.readUInt32LE(at) : bytes.readUInt32BE(at);
      const ifd = tiff + u32(tiff + 4);
      const entries = u16(ifd);
      for (let i = 0; i < entries; i++) {
        const entry = ifd + 2 + i * 12;
        if (u16(entry) === 0x0112) return u16(entry + 8);
      }
      return 1;
    }
    if (marker === 0xda) return 1; // image data starts: no EXIF before it
    offset += 2 + size;
  }
  return 1;
}

/**
 * One photo on its own A4 page, as large as fits inside the margin. A
 * landscape photo gets a landscape page. EXIF orientations 3, 6 and 8 (the
 * ones phones write) are turned upright; mirrored ones print as stored.
 */
function addImagePage(pdf: PDFDocument, image: PDFImage, orientation: number): void {
  const quarterTurn = orientation === 6 || orientation === 8;
  const shownW = quarterTurn ? image.height : image.width;
  const shownH = quarterTurn ? image.width : image.height;
  const landscape = shownW > shownH;
  const pageW = landscape ? A4.height : A4.width;
  const pageH = landscape ? A4.width : A4.height;
  const scale = Math.min((pageW - 2 * MARGIN) / shownW, (pageH - 2 * MARGIN) / shownH);
  const w = shownW * scale;
  const h = shownH * scale;
  const x = (pageW - w) / 2;
  const y = (pageH - h) / 2;
  const page = pdf.addPage([pageW, pageH]);

  // drawImage rotates about the image's bottom-left corner, so each turn starts from a different corner.
  if (orientation === 6) {
    page.drawImage(image, { x, y: y + h, width: h, height: w, rotate: degrees(-90) });
  } else if (orientation === 8) {
    page.drawImage(image, { x: x + w, y, width: h, height: w, rotate: degrees(90) });
  } else if (orientation === 3) {
    page.drawImage(image, { x: x + w, y: y + h, width: w, height: h, rotate: degrees(180) });
  } else {
    page.drawImage(image, { x, y, width: w, height: h });
  }
}

/**
 * Joins documents into one PDF, in the order asked, so a whole selection goes
 * to the printer in one job. PDFs keep their pages; JPG and PNG photos get one
 * A4 page each. Any other file is refused by name before anything is read.
 */
@Injectable()
export class DocumentPrintService {
  private readonly logger = new Logger(DocumentPrintService.name);

  constructor(
    private readonly documentService: DocumentService,
    private readonly storageService: StorageService,
  ) {}

  async bundle(ids: string[]): Promise<Buffer> {
    const docs = await Promise.all(ids.map((id) => this.documentService.findById(id)));

    // Fail fast on what the stored type already rules out, before reading anything.
    const unsupported = docs.filter((doc) => !mayPrint(doc)).map((doc) => doc.fileName);
    if (unsupported.length > 0) throw unsupportedError(unsupported);
    // bigint column: the driver hands it back as a string.
    const knownBytes = docs.reduce((sum, doc) => sum + (Number(doc.fileSizeBytes) || 0), 0);
    if (knownBytes > MAX_PRINT_BYTES) throw tooLargeError();

    // A few files in memory at a time: the server has 1 GB, and a selection can
    // be 50 photos. Reading a few together hides storage latency; they are
    // still added in the order asked.
    const out = await PDFDocument.create();
    let readBytes = 0;
    for (let start = 0; start < docs.length; start += READ_AHEAD) {
      const batch = docs.slice(start, start + READ_AHEAD);
      const contents = await Promise.all(batch.map((doc) => this.read(doc)));
      readBytes += contents.reduce((sum, bytes) => sum + bytes.length, 0);
      if (readBytes > MAX_PRINT_BYTES) throw tooLargeError();
      for (const [index, doc] of batch.entries()) {
        await this.append(out, doc, contents[index]!);
      }
    }
    return Buffer.from(await out.save());
  }

  private async append(out: PDFDocument, doc: DocumentEntity, bytes: Buffer): Promise<void> {
    const kind = kindOf(bytes);
    if (!kind) throw unsupportedError([doc.fileName]);
    try {
      if (kind === 'pdf') {
        const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await out.copyPages(source, source.getPageIndices());
        pages.forEach((page) => out.addPage(page));
      } else if (kind === 'jpg') {
        addImagePage(out, await out.embedJpg(bytes), jpegOrientation(bytes));
      } else {
        addImagePage(out, await out.embedPng(bytes), 1);
      }
    } catch (err) {
      this.logger.warn(`Could not add ${doc.id} to a print bundle: ${(err as Error).message}`);
      throw new BadRequestException(`${doc.fileName} could not be read for printing.`);
    }
  }

  private async read(doc: DocumentEntity): Promise<Buffer> {
    const fileKey = this.storageService.extractFileKeyFromUrl(doc.fileUrl);
    if (!fileKey) throw new BadRequestException(`${doc.fileName} is missing from storage.`);
    try {
      return await this.storageService.readFile(fileKey);
    } catch (err) {
      const name = (err as { name?: string }).name;
      if (name === 'NoSuchKey' || name === 'NotFound') {
        throw new BadRequestException(`${doc.fileName} is missing from storage.`);
      }
      throw err;
    }
  }
}

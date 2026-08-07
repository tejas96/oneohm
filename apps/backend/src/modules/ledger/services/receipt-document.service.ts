import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DocumentCategory,
  DocumentEntityType,
  DocumentTag,
  FileCategory,
} from '@tejas96/shared/types';
import { DataSource } from 'typeorm';

import { DocumentEntity } from '../../documents/entities/document.entity';
import { DocumentService } from '../../documents/services/document.service';
import { StorageService } from '../../storage/services/storage.service';
import { LedgerRepository } from '../repositories/ledger.repository';

/**
 * Files the payment receipt we ISSUE to the customer.
 *
 * Deliberately separate from {@link LedgerWriteService}: that owns the money and
 * runs everything in one transaction, whereas this runs strictly afterwards. The
 * receipt has to print `entry_no`, which is minted inside the write transaction,
 * and the PDF itself is rendered in the browser because the backend has no PDF
 * library — so the bytes cannot exist until after the payment has committed.
 *
 * The consequence worth stating plainly: a failure here must never look like a
 * failed payment. The money is already recorded, and the receipt is regenerable
 * from data at any time.
 *
 * Not to be confused with the proof-of-payment upload on the write path, which
 * is the CUSTOMER's own evidence. Both land on the same property so they sit
 * together in the customer's paperwork; the tag tells them apart.
 */
@Injectable()
export class ReceiptDocumentService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly ledgerRepository: LedgerRepository,
    private readonly storageService: StorageService,
    private readonly documentService: DocumentService,
  ) {}

  /**
   * File a generated payment receipt against the entry's property.
   *
   * Separate from {@link attachProof}, which records the CUSTOMER's own evidence
   * of paying. This is the document we issue back to them. Both land on the same
   * property so they sit together in the customer's paperwork; the tag tells them
   * apart.
   *
   * Runs on its own connection AFTER the receipt has committed — it cannot be
   * folded into `recordReceipt`'s transaction, because the PDF has to print
   * `entry_no`, which is minted inside that transaction, and the bytes are
   * rendered in the browser. Consequently a failure here must never look like a
   * failed payment: the money is already recorded, and the receipt is
   * regenerable from data at any time.
   */
  async storeGeneratedReceipt(
    entryId: string,
    file: { buffer: Buffer; originalname?: string; mimetype?: string },
    createdBy: string,
  ): Promise<DocumentEntity> {
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('A receipt must be a PDF');
    }
    if (!file.buffer?.length) {
      throw new BadRequestException('The receipt file is empty');
    }

    const entry = await this.ledgerRepository.findEntryById(entryId);
    if (!entry) {
      throw new NotFoundException(`Ledger entry ${entryId} not found`);
    }
    if (entry.direction !== 'in') {
      throw new BadRequestException('Only money-in entries have a payment receipt');
    }

    const rows = await this.dataSource.query(`SELECT property_id FROM projects WHERE id = $1`, [
      entry.projectId,
    ]);
    const propertyId = rows[0]?.property_id as string | undefined;
    if (!propertyId) {
      throw new BadRequestException('Cannot file the receipt: the project has no property');
    }

    const fileName = file.originalname?.endsWith('.pdf')
      ? file.originalname
      : `Receipt-${entry.entryNo}.pdf`;

    const upload = await this.storageService.uploadBuffer({
      buffer: file.buffer,
      fileName,
      contentType: 'application/pdf',
      category: FileCategory.DOCUMENT,
      entityId: entry.id,
      entityType: DocumentEntityType.LEDGER_ENTRY,
      propertyId,
      subCategory: 'receipt_pdf',
    });

    return this.documentService.create(
      {
        propertyId,
        entityType: DocumentEntityType.LEDGER_ENTRY,
        entityId: entry.id,
        category: DocumentCategory.DOCUMENT,
        tag: DocumentTag.RECEIPT_PDF,
        fileName: upload.fileName,
        // The PUBLIC URL, not the raw storage key. `GET /documents/:id/download`
        // returns `fileUrl` verbatim, so a key-valued row is not downloadable —
        // which is the existing flaw in the proof rows written by attachProof.
        fileUrl: upload.publicUrl,
        fileSizeBytes: file.buffer.length,
        mimeType: 'application/pdf',
        metadata: {
          entryNo: entry.entryNo,
          projectId: entry.projectId,
          amountPaise: entry.amountPaise,
          valueDate: entry.valueDate,
          source: 'ledger_receipt',
          storageKey: upload.fileKey,
        },
      },
      createdBy,
    );
  }
}

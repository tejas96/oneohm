/**
 * File Utility Functions
 * Shared utilities for file type detection, extension parsing, and
 * file-type icon/colour metadata.
 *
 * @module lib/utils/file
 */

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
const PDF_EXTENSIONS = ['pdf'];
const WORD_EXTENSIONS = ['doc', 'docx'];
const EXCEL_EXTENSIONS = ['xls', 'xlsx', 'csv'];
const TEXT_EXTENSIONS = ['txt', 'md'];

/**
 * Canonical file-type categories used for icon/colour selection.
 * Add a new value here when a new type is needed, then extend
 * FILE_TYPE_CONFIG below.
 */
export type FileType = 'image' | 'pdf' | 'word' | 'excel' | 'text' | 'generic';

/**
 * Maps a FileType to the MUI icon name and a colour token.
 *
 * icon:  name of the @mui/icons-material export (PascalCase, without "Icon" suffix)
 * color: any valid MUI sx color string (palette token or hex)
 *
 * To add support for a new file type in the future:
 *   1. Add a value to the `FileType` union above.
 *   2. Add an entry here with the desired icon name and colour.
 *   3. Import and render the new icon in FileTypeIcon (file-type-icon.tsx).
 */
export const FILE_TYPE_CONFIG: Record<
  FileType,
  { iconName: string; color: string; label: string }
> = {
  image: { iconName: 'Image', color: '#4CAF50', label: 'Image' },
  pdf: { iconName: 'PictureAsPdf', color: '#F44336', label: 'PDF' },
  word: { iconName: 'Description', color: '#2196F3', label: 'Document' },
  excel: { iconName: 'TableChart', color: '#4CAF50', label: 'Sheet' },
  text: { iconName: 'Article', color: '#9E9E9E', label: 'Text' },
  generic: { iconName: 'InsertDriveFile', color: '#9E9E9E', label: 'File' },
};

/**
 * Derive the FileType category from a filename.
 *
 * @example
 * getFileType('report.pdf')   // 'pdf'
 * getFileType('photo.jpg')    // 'image'
 * getFileType('data.xlsx')    // 'excel'
 * getFileType('unknown.bin')  // 'generic'
 */
export function getFileType(fileName: string): FileType {
  const ext = getFileExtension(fileName);
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (PDF_EXTENSIONS.includes(ext)) return 'pdf';
  if (WORD_EXTENSIONS.includes(ext)) return 'word';
  if (EXCEL_EXTENSIONS.includes(ext)) return 'excel';
  if (TEXT_EXTENSIONS.includes(ext)) return 'text';
  return 'generic';
}

/**
 * Extract the lowercase file extension from a filename
 *
 * @example
 * getFileExtension('photo.JPG') // 'jpg'
 * getFileExtension('document.pdf') // 'pdf'
 * getFileExtension('noext') // ''
 */
export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

/**
 * Check if a filename has an image extension (jpg, jpeg, png, gif, webp, svg)
 */
export function isImageFile(fileName: string): boolean {
  return IMAGE_EXTENSIONS.includes(getFileExtension(fileName));
}

/**
 * Check if a filename has a PDF extension
 */
export function isPdfFile(fileName: string): boolean {
  return PDF_EXTENSIONS.includes(getFileExtension(fileName));
}

/**
 * Check if a filename is previewable in the browser (image or PDF)
 */
export function isPreviewableFile(fileName: string): boolean {
  return isImageFile(fileName) || isPdfFile(fileName);
}

/**
 * Extract the S3/Tigris file key from a full public URL.
 * If the input is already a bare key (no protocol), returns it as-is.
 */
export function extractFileKey(documentUrl: string): string {
  if (!documentUrl) return documentUrl;
  if (documentUrl.includes('://')) {
    try {
      return new URL(documentUrl).pathname.slice(1);
    } catch {
      return documentUrl;
    }
  }
  return documentUrl;
}

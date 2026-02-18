/**
 * File Utility Functions
 * Shared utilities for file type detection and extension parsing
 *
 * @module lib/utils/file
 */

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
const PDF_EXTENSIONS = ['pdf'];

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

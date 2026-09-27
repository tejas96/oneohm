import { TAG_LABEL_MAP } from './constants';

import { getFileExtension } from '@/lib/utils/file';

export function getTagLabel(tag: string): string {
  return TAG_LABEL_MAP[tag] ?? tag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatBytes(bytes: number | undefined): string {
  if (bytes == null) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDocDate(dateString?: string): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const PRINTABLE_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const PRINTABLE_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png']);

/**
 * Whether the print bundle can take this file: PDFs and JPG/PNG photos. A
 * file with neither a type nor an extension is let through; the server reads
 * its first bytes and names it if it cannot be printed.
 */
export function isPrintableFile(doc: { fileName: string; mimeType?: string | null }): boolean {
  if (doc.mimeType) return PRINTABLE_MIME.has(doc.mimeType);
  const ext = getFileExtension(doc.fileName);
  return !doc.fileName.includes('.') || PRINTABLE_EXTENSIONS.has(ext);
}

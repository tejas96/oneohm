import { DOCUMENT_TYPE_LABELS } from './constants';

/**
 * Get human-readable label for a document tag.
 * Falls back to title-cased tag if not in the lookup.
 */
export function getDocumentTypeLabel(tag: string): string {
  return (
    DOCUMENT_TYPE_LABELS[tag] || tag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

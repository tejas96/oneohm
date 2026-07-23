/**
 * Normalize a raw structure type input to canonical snake_case code.
 * Returns null if the result would be empty after normalization.
 */
export function normalizeStructureTypeCode(raw: string): string | null {
  if (typeof raw !== 'string') return null;

  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized.length > 0 ? normalized : null;
}

/** Max input length — structure type codes are short identifiers. */
const MAX_STRUCTURE_TYPE_LENGTH = 128;

/**
 * Normalize a raw structure type input to canonical snake_case code.
 * Returns null if the result would be empty after normalization.
 *
 * Implemented with linear-time string scans (no regex) to avoid ReDoS on user input.
 */
export function normalizeStructureTypeCode(raw: string): string | null {
  if (typeof raw !== 'string') return null;

  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.length > MAX_STRUCTURE_TYPE_LENGTH) return null;

  const tokens: string[] = [];
  for (const char of trimmed) {
    if ((char >= 'a' && char <= 'z') || (char >= '0' && char <= '9')) {
      tokens.push(char);
    } else if (char === ' ' || char === '-' || char === '_') {
      tokens.push('_');
    }
  }

  const collapsed: string[] = [];
  let lastWasUnderscore = false;
  for (const char of tokens) {
    if (char === '_') {
      if (collapsed.length > 0 && !lastWasUnderscore) {
        collapsed.push('_');
        lastWasUnderscore = true;
      }
      continue;
    }
    collapsed.push(char);
    lastWasUnderscore = false;
  }

  let start = 0;
  let end = collapsed.length;
  while (start < end && collapsed[start] === '_') start++;
  while (end > start && collapsed[end - 1] === '_') end--;

  const normalized = collapsed.slice(start, end).join('');
  return normalized.length > 0 ? normalized : null;
}

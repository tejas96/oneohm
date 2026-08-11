/**
 * Escape `%`, `_`, and `\` for safe use inside SQL ILIKE patterns with ESCAPE '\\'.
 */
export function escapeIlikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

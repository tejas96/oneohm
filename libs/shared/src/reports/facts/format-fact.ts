/**
 * How a few typed facts are printed. Shared so the Reports form can show
 * exactly what the PDF will say ("Prints as: …") with the same rule.
 */

/** Earth resistances as typed: the pit count the user wrote (if any) and each value. */
function parseEarthing(raw: string): { declared: number | null; values: string[] } | null {
  const value = raw.trim();
  if (!value || /Ω|ohm/i.test(value)) return null;
  const counted = /^(\d+)\s*-\s*(.+)$/.exec(value);
  const values = (counted ? counted[2]! : value).split(/[\s,;]+/).filter(Boolean);
  if (values.length === 0 || !values.every((v) => /^\d+(\.\d+)?$/.test(v))) return null;
  return { declared: counted ? Number(counted[1]) : null, values };
}

/**
 * Earth resistances typed as plain numbers get the pit count and Ω added:
 * "3, 4, 3" and "3 - 3, 4, 3" both print "3 - 3Ω, 4Ω, 3Ω". A value that
 * already carries Ω (or "ohm"), or anything that is not a list of numbers,
 * prints exactly as typed.
 */
export function formatEarthing(raw: string): string {
  const parsed = parseEarthing(raw);
  if (!parsed) return raw.trim();
  const count = parsed.declared ?? parsed.values.length;
  return `${count} - ${parsed.values.map((v) => `${v}Ω`).join(', ')}`;
}

/** "3 - 3, 4": the pit count written does not match the values given. Null when they agree. */
export function earthingCountMismatch(raw: string): { declared: number; given: number } | null {
  const parsed = parseEarthing(raw);
  if (!parsed || parsed.declared === null || parsed.declared === parsed.values.length) return null;
  return { declared: parsed.declared, given: parsed.values.length };
}

/** Serial numbers typed one per line, or with commas or spaces. */
export function splitSerials(raw: string): string[] {
  return raw.split(/[\s,;]+/).filter(Boolean);
}

/** Serial numbers print as one comma-separated list. */
export function formatSerials(raw: string): string {
  return splitSerials(raw).join(', ');
}

/** Serials that appear more than once, each named once. */
export function repeatedSerials(raw: string): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const serial of splitSerials(raw)) {
    const key = serial.toUpperCase();
    if (seen.has(key)) repeated.add(serial);
    seen.add(key);
  }
  return [...repeated];
}

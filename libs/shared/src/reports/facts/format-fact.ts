/**
 * How a few typed facts are printed. Shared so the Reports form can show
 * exactly what the PDF will say ("Prints as: …") with the same rule.
 */

/** Earth resistances as typed: the pit count the user wrote (if any) and each value. */
function parseEarthing(raw: string): { declared: number | null; values: string[] } | null {
  const value = raw.trim();
  if (!value || /Ω|ohm/i.test(value)) return null;
  // "3 - 3, 4, 3": a pit count before the dash. Split by hand, not with one
  // regex: overlapping \s* and .+ around the dash backtrack badly on long input.
  const dash = value.indexOf('-');
  const head = dash >= 0 ? value.slice(0, dash).trim() : '';
  const counted = dash >= 0 && /^\d+$/.test(head);
  const values = (counted ? value.slice(dash + 1) : value).split(/[\s,;]+/).filter(Boolean);
  if (values.length === 0 || !values.every((v) => /^\d+(\.\d+)?$/.test(v))) return null;
  return { declared: counted ? Number(head) : null, values };
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

/** An amount as typed or copied from print ("₹2,15,205/-", "2,15,205") → "215205". */
export function normalizeMoney(raw: string): string {
  return raw
    .trim()
    .replace(/\/-$/, '')
    .replace(/[₹,\s]/g, '');
}

/**
 * Rupees in whole rupees with Indian grouping: 944817.93 prints "₹9,44,818/-"
 * ("/-" means no paise). Anything that is not a number prints as typed.
 */
export function formatRupees(raw: string): string {
  const value = normalizeMoney(raw);
  const amount = Number(value);
  if (!value || !Number.isFinite(amount)) return raw.trim();
  return `₹${Math.round(amount).toLocaleString('en-IN')}/-`;
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

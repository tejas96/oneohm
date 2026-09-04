/**
 * Display helpers for integer paise.
 *
 * The API sends money as integer paise and that value is authoritative. These
 * helpers exist so components can *render* rupees without ever *computing* in
 * them — summing formatted rupee values reintroduces the float drift the ledger
 * rebuild removed. If you need a total, ask the API for it.
 */

/** `₹1,23,456.78` — Indian digit grouping. */
export function formatPaise(paise: number, opts?: { compact?: boolean }): string {
  const rupees = (paise ?? 0) / 100;
  if (opts?.compact && Math.abs(rupees) >= 100000) {
    return `₹${(rupees / 100000).toFixed(2)}L`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/** Rupee input → integer paise, matching the backend's rounding exactly. */
export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) return 0;
  // toFixed(6) first: 1.005 * 100 is 100.49999999999999 in binary floating point,
  // so a naive round yields 100 paise instead of 101.
  const scaled = Number((Math.abs(rupees) * 100).toFixed(6));
  return Math.sign(rupees) * Math.round(scaled);
}

export function paiseToRupees(paise: number): number {
  return (paise ?? 0) / 100;
}

/**
 * The largest amount any money field accepts: ₹100 crore, in paise.
 *
 * Not a business rule — a safety rail. Paise are carried as JS numbers up to
 * the moment they reach the API, and above Number.MAX_SAFE_INTEGER (about
 * ₹90,071 crore) arithmetic silently loses precision: the request would be
 * accepted and store a number nobody typed. ₹100 crore is far above any real
 * residential or commercial solar contract while staying three orders of
 * magnitude inside that limit.
 */
export const MAX_MONEY_INPUT_PAISE = 100_00_00_000_00;

export type RupeeInput =
  | { ok: true; paise: number }
  | { ok: false; reason: 'empty' | 'not-a-number' | 'not-positive' | 'too-large' };

/**
 * Read what a person typed into a money field.
 *
 * Every money dialog used `rupeesToPaise(Number(text))` and tested `> 0`, which
 * left three holes:
 *
 *  - "1,000" — how an Indian user actually writes it — parsed as NaN, so the
 *    submit button went dead with nothing on screen explaining why. Commas and
 *    spaces are stripped instead.
 *  - "1e15" parsed happily to 1e17 paise, past MAX_SAFE_INTEGER, where the
 *    number stops being the number typed. Rejected now.
 *  - Nothing distinguished "empty", "unparseable" and "zero", so no field could
 *    say which had happened.
 *
 * Returns a reason rather than throwing, so the caller decides what to say.
 */
export function parseRupeeInput(text: string): RupeeInput {
  const cleaned = text.replace(/[,\s₹]/g, '');
  if (cleaned === '') return { ok: false, reason: 'empty' };

  const rupees = Number(cleaned);
  if (!Number.isFinite(rupees)) return { ok: false, reason: 'not-a-number' };

  const paise = rupeesToPaise(rupees);
  // `0.001` rounds to 0 paise: typed something, meant something, worth nothing.
  // It belongs with zero rather than with unparseable text.
  if (paise <= 0) return { ok: false, reason: 'not-positive' };
  if (paise > MAX_MONEY_INPUT_PAISE) return { ok: false, reason: 'too-large' };

  return { ok: true, paise };
}

/** The message to show under a field for a rejected amount. */
export function rupeeInputError(result: RupeeInput): string | undefined {
  if (result.ok) return undefined;
  switch (result.reason) {
    case 'empty':
      return undefined; // An untouched field is not an error.
    case 'not-a-number':
      return 'Enter an amount in numbers.';
    case 'not-positive':
      return 'Enter an amount greater than zero.';
    case 'too-large':
      return `That is above the ${formatPaise(MAX_MONEY_INPUT_PAISE)} limit for a single entry.`;
  }
}

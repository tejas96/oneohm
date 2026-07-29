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

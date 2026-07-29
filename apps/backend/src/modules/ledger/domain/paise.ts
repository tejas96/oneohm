/**
 * Money primitives for the ledger.
 *
 * All ledger money is stored as **signed integer paise** in `BIGINT` columns,
 * never as `NUMERIC`/`decimal`. The existing finance code stores `NUMERIC(15,2)`
 * and reads it back through TypeORM as a **string** (node-postgres does not
 * coerce `numeric`), which is why `payment.service.ts:99-102` compares money
 * lexicographically — `'9000.00' > '50000.00'` is `true`. Integers remove that
 * entire failure mode, and make `SUM` exact.
 *
 * Caveat that bites the same way if ignored: `pg` also returns `BIGINT` as a
 * string, and `SUM(bigint)` returns `numeric`. Every paise column needs
 * `paiseTransformer`, and every `SUM()` in a view needs an explicit `::BIGINT`
 * cast.
 */

/**
 * TypeORM column transformer for `BIGINT` paise columns.
 *
 * `Number` is lossless here: `Number.MAX_SAFE_INTEGER` is ~9.007e15 paise, i.e.
 * about ₹90,000 crore — four orders of magnitude above any plausible project.
 */
export const paiseTransformer = {
  to: (value: number | null | undefined): number | null => value ?? null,
  from: (value: string | number | null | undefined): number | null =>
    value === null || value === undefined ? null : Number(value),
};

/**
 * Convert a rupee amount to integer paise, rounding half away from zero.
 *
 * The `toFixed(6)` is load-bearing, not decoration. `1.005` is not representable
 * in binary — the nearest double is `1.00499999999999989`, so `1.005 * 100` is
 * `100.49999999999999` and a naive `Math.round` yields **100 paise, not 101**.
 * Normalising to 6 decimal places first absorbs the representation error while
 * staying far away from any real precision boundary.
 */
export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) {
    throw new Error(`rupeesToPaise: expected a finite number, got ${rupees}`);
  }
  const scaled = Number((Math.abs(rupees) * 100).toFixed(6));
  return Math.sign(rupees) * Math.round(scaled);
}

/** Convert integer paise to a rupee number. Display only — never re-round and store. */
export function paiseToRupees(paise: number): number {
  assertInteger(paise, 'paiseToRupees');
  return paise / 100;
}

/** Format paise for display with Indian digit grouping, e.g. `₹1,23,456.78`. */
export function formatPaise(paise: number): string {
  assertInteger(paise, 'formatPaise');
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

/**
 * Split a total across percentage weights so the parts sum **exactly** to the
 * total.
 *
 * Every part but the last is floored; the final part absorbs the remainder.
 * Without this, a ₹1,00,000 contract split three ways produces
 * 33,333.33 × 3 = 99,999.99 and leaves one paisa unbillable forever — which is
 * how a customer ends up showing "₹0.01 pending" until someone waives it.
 *
 * @param totalPaise  positive integer paise
 * @param percentages weights that must sum to 100 (within a 0.01 tolerance)
 */
export function splitByPercentage(totalPaise: number, percentages: number[]): number[] {
  assertInteger(totalPaise, 'splitByPercentage');
  if (totalPaise <= 0) {
    throw new Error(`splitByPercentage: totalPaise must be > 0, got ${totalPaise}`);
  }
  if (percentages.length === 0) {
    throw new Error('splitByPercentage: percentages must not be empty');
  }
  if (percentages.some((p) => !Number.isFinite(p) || p <= 0)) {
    throw new Error(`splitByPercentage: every percentage must be > 0, got ${percentages.join()}`);
  }

  const sum = percentages.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 100) > 0.01) {
    throw new Error(`splitByPercentage: percentages must sum to 100, got ${sum}`);
  }

  const parts = percentages.slice(0, -1).map((pct) => Math.floor((totalPaise * pct) / 100));

  const allocated = parts.reduce((a, b) => a + b, 0);
  parts.push(totalPaise - allocated);

  return parts;
}

function assertInteger(value: number, fn: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${fn}: expected integer paise, got ${value}`);
  }
}

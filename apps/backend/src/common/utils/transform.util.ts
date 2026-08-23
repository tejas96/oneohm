/**
 * Safely convert a value to a number, returning undefined for null/undefined.
 * PostgreSQL decimal/numeric columns are returned as strings by TypeORM.
 * Use this in @Transform decorators to ensure numeric API responses.
 */
export const toNum = (v: unknown): number | undefined => (v != null ? Number(v) : undefined);

/**
 * Like toNum but preserves null (for fields typed `number | null`
 * where null has semantic meaning, e.g. "not yet approved").
 */
export const toNumNullable = (v: unknown): number | null => (v != null ? Number(v) : null);

export const WATTS_PER_KW = 1000;

/**
 * Convert panel wattage (Wp) to system size in kW, rounded to 2 decimal places.
 */
export function wattsToKw(wattage: number | string | null | undefined): number | undefined {
  const w = toNum(wattage);
  if (w == null || w <= 0) return undefined;
  return Number((w / WATTS_PER_KW).toFixed(2));
}

/**
 * The system size of a quote version, in kW, derived only from `total_wattage_wp`.
 *
 * This is what is going on the roof — panel count × panel Wp, summed. The
 * selected/quoted kW column was removed; wattage is the single source of truth.
 */
export const systemSizeKwOf = (version: {
  totalWattageWp?: number | string | null;
}): number | undefined => wattsToKw(version?.totalWattageWp);

/**
 * The same rule, as SQL, for ORDER BY and WHERE clauses (TypeORM property names).
 *
 * `alias` is the quote-version alias in the query — `cv` almost everywhere.
 */
export const systemSizeKwSql = (alias: string): string =>
  `CASE WHEN ${alias}.totalWattageWp > 0 THEN ROUND((${alias}.totalWattageWp / 1000.0)::numeric, 2) ELSE NULL END`;

/**
 * Raw SQL column names (`total_wattage_wp`) for repositories that use snake_case.
 */
export const systemSizeKwSqlRaw = (alias: string): string =>
  `CASE WHEN ${alias}.total_wattage_wp > 0 THEN ROUND((${alias}.total_wattage_wp / 1000.0)::numeric, 2) ELSE NULL END`;

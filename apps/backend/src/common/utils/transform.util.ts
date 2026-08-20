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

/**
 * The system size of a quote version, in kW.
 *
 * PREFERS THE MODULES ACTUALLY SELECTED (`total_wattage_wp / 1000`) OVER THE
 * QUOTED FIGURE (`system_size_kw`).
 *
 * They diverge constantly and by design: somebody quotes 3 kW, the panels that
 * fit the roof are six 570 Wp modules, and the installation is 3.42 kW. The
 * quoted number is what was asked for; the wattage is what is going on the
 * roof, and it is the one every screen should be showing.
 *
 * This rule already existed in three places before this helper — the customer
 * portfolio roll-up, the property sort and filter, and the auto-generated
 * project NAME — which is why a project could be called "… - 3.42kW" while its
 * own `systemSizeKw` field said 3.00. The projects DTOs were the outlier.
 *
 * `total_wattage_wp` is `NOT NULL` and populated on every one of the 1820 quote
 * versions on record, so the fallback is a guard rather than a routine path.
 */
export const systemSizeKwOf = (version: {
  totalWattageWp?: number | string | null;
  systemSizeKw?: number | string | null;
}): number | undefined => {
  const wattage = toNum(version?.totalWattageWp);
  if (wattage != null && wattage > 0) {
    return Number((wattage / 1000).toFixed(2));
  }
  return toNum(version?.systemSizeKw);
};

/**
 * The same rule, as SQL, for ORDER BY and WHERE clauses.
 *
 * `alias` is the quote-version alias in the query — `cv` almost everywhere.
 */
export const systemSizeKwSql = (alias: string): string =>
  `CASE WHEN ${alias}.totalWattageWp > 0 THEN ${alias}.totalWattageWp / 1000.0 ELSE ${alias}.systemSizeKw END`;

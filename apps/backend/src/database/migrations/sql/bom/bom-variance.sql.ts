/**
 * Project BOM variance, and the assertion that it reconciles.
 *
 * Two independent paths to the same number:
 *   current_paise    = SUM(quantity        × unit_price_paise)  from bom_items
 *   log_impact_paise = SUM(cost_impact_paise)                   from bom_changes
 *
 * They must be equal: seeding writes a log row per line, and every edit writes
 * its log row in the same transaction as the item change (BomChangeRepository
 * .append always takes the caller's manager for exactly this reason — see
 * bom-change.repository.ts). If they ever diverge, some path wrote an item
 * without logging it — and since bom_changes is append-only
 * (trg_bom_changes_append_only, 1856300000000-AddBomChangeLogAndSerials.ts),
 * that history can never be repaired afterwards. So it is asserted at
 * migration time, in the same shape v_project_balance asserts
 * quoted + change_order = contract (sql/ledger/12-contract-composition.sql.ts).
 *
 * ROUNDED PER LINE, NOT ONCE AT THE END — those differ. `quantity` is
 * NUMERIC(12,3) and `unit_price_paise` is BIGINT, so their raw product can
 * land on a fraction of a paisa, while `cost_impact_paise` is an integer,
 * written by BomEditService.lineTotalPaise as `Math.round(quantity *
 * unitPricePaise)` — rounded per line, before summing (bom-edit.service.ts).
 * BomReadService.getForProject rounds identically when it computes
 * `totals.currentPaise`. Comparing this view's `current_paise` against
 * `log_impact_paise` only reconstructs both of those if it rounds the same
 * way: measured on the live oneohm_epc_bom database, comparing the raw
 * unrounded sums failed on 81 of 153 project BOMs — by fractions of a paisa,
 * ~16 paise in total — while rounding each line first (as below) failed on
 * zero. SUM(ROUND(x)) and ROUND(SUM(x)) are not interchangeable in general;
 * only summing each line's own rounded value matches how the log was built.
 *
 * quoted_paise is derived the same way, from quoted_quantity, so it is built
 * on the identical rounding rule as current_paise and log_impact_paise.
 */
export const CREATE_V_PROJECT_BOM_VARIANCE = `
  CREATE OR REPLACE VIEW v_project_bom_variance AS
  SELECT b.project_id,
         b.id                                                   AS bom_id,
         b.bom_number,
         COALESCE(it.quoted_paise,  0)::BIGINT                   AS quoted_paise,
         COALESCE(it.current_paise, 0)::BIGINT                   AS current_paise,
         (COALESCE(it.current_paise, 0) - COALESCE(it.quoted_paise, 0))::BIGINT
                                                                 AS variance_paise,
         COALESCE(ch.log_impact_paise, 0)::BIGINT                AS log_impact_paise,
         COALESCE(it.line_count,   0)::int                       AS line_count,
         COALESCE(it.added_count,  0)::int                       AS added_line_count,
         COALESCE(it.removed_count,0)::int                       AS removed_line_count
    FROM bom b
    LEFT JOIN LATERAL (
      SELECT SUM(ROUND(COALESCE(i.quoted_quantity, 0) * i.unit_price_paise))::BIGINT
                                                                 AS quoted_paise,
             SUM(ROUND(i.quantity * i.unit_price_paise))::BIGINT AS current_paise,
             COUNT(*)::int                                       AS line_count,
             COUNT(*) FILTER (WHERE i.quoted_quantity IS NULL)::int
                                                                 AS added_count,
             COUNT(*) FILTER (WHERE i.quantity = 0 AND i.quoted_quantity > 0)::int
                                                                 AS removed_count
        FROM bom_items i WHERE i.bom_id = b.id
    ) it ON TRUE
    LEFT JOIN LATERAL (
      SELECT SUM(c.cost_impact_paise)::BIGINT AS log_impact_paise
        FROM bom_changes c WHERE c.bom_id = b.id
    ) ch ON TRUE
   WHERE b.project_id IS NOT NULL
`;

/** The log must always reconstruct the current BOM value, on every project. */
export const ASSERT_BOM_RECONCILES = `
  DO $$
  DECLARE bad INT;
  BEGIN
    SELECT COUNT(*) INTO bad
      FROM v_project_bom_variance
     WHERE current_paise <> log_impact_paise;
    IF bad > 0 THEN
      RAISE EXCEPTION
        'BomVariance: bom_changes does not reconstruct current BOM value on % project(s)', bad;
    END IF;
  END $$
`;

export const CREATE_BOM_VARIANCE: string[] = [
  CREATE_V_PROJECT_BOM_VARIANCE,
  ASSERT_BOM_RECONCILES,
];

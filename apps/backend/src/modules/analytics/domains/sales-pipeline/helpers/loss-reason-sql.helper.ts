/**
 * Loss-reason breakdown: how many leads were lost and how many projects were
 * cancelled, per `loss_reason`, in one pass over both sources.
 *
 * `loss_reason` on `customer_properties` and `projects` is a nullable
 * structured column (Task 1) that sits alongside each table's older
 * free-text reason field. Values written before this feature existed — and
 * any row a caller leaves unset — are `NULL`, so both branches of the union
 * fold those into `'other'` rather than dropping them from the count.
 *
 * Params: `[fromDate, toDate]`, both `date`-castable strings. A lead counts
 * by `lost_at`, a project by `cancelled_at` — each source's own point of
 * loss, not a shared column.
 *
 * Both are `timestamptz`, so the upper bound is `< ($2::date + INTERVAL '1
 * day')`, not `<= $2::date`. `$2::date` is midnight on the closing day, so
 * `<=` counted only losses recorded at exactly 00:00:00 that day and dropped
 * the rest — and since the default window ends today, today's losses never
 * appeared at all. Same half-open pattern as
 * `sales-pipeline-sql.helper.ts`'s cohort window.
 */
export const LOSS_REASON_BREAKDOWN_SQL = `
  SELECT reason AS "lossReason",
         SUM(is_lead)::int    AS "leadsLost",
         SUM(is_project)::int AS "projectsCancelled"
    FROM (
      SELECT COALESCE(loss_reason, 'other') AS reason, 1 AS is_lead, 0 AS is_project
        FROM customer_properties
       WHERE status = 'lost' AND deleted_at IS NULL
         AND lost_at >= $1::date AND lost_at < ($2::date + INTERVAL '1 day')
      UNION ALL
      SELECT COALESCE(loss_reason, 'other'), 0, 1
        FROM projects
       WHERE status = 'cancelled' AND deleted_at IS NULL
         AND cancelled_at >= $1::date AND cancelled_at < ($2::date + INTERVAL '1 day')
    ) rows
   GROUP BY reason
   ORDER BY (SUM(is_lead) + SUM(is_project)) DESC
`;

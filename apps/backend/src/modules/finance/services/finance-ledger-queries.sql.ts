/**
 * Org-wide finance reporting, read from the ledger.
 *
 * These replace the equivalent queries in `finance-aggregation.service.ts`,
 * which read `payments`, `project_payment_terms.paid_amount` and
 * `project_expenses` directly. Three problems went away with that:
 *
 *  1. **Outstanding had eight definitions.** Every query rolled its own
 *     `expected - paid`. Now there is one, in `v_milestone_balance`, and these
 *     queries only sum it.
 *  2. **Dates were the data-entry date.** `payments` had no value date at all,
 *     so every cash-flow bucket and ageing figure keyed off `created_at`. The
 *     ledger has `value_date`.
 *  3. **Reversals were invisible.** A bounced cheque left a `status` flip that
 *     the aggregates ignored. A reversal is now a negative row, so every `SUM`
 *     is net of it automatically.
 *
 * Money is returned as **paise** (`bigint`), so every aggregate is cast
 * `::BIGINT` — `SUM(bigint)` returns `numeric`, which node-postgres hands back
 * as a string and would silently reintroduce string arithmetic.
 */

/**
 * Headline KPIs for the selected period.
 *
 * `revenueInRange` / `spendInRange` are FLOWS bounded by `value_date`;
 * `outstandingNow` is a SNAPSHOT as of today and deliberately ignores the range
 * — money owed does not belong to a month. The UI has to make that distinction
 * legible, which is why it is called out here.
 */
export const KPIS_SQL = `
  WITH flows AS (
    SELECT
      COALESCE(SUM(amount_paise) FILTER (WHERE direction = 'in'), 0)::BIGINT  AS revenue_paise,
      COALESCE(SUM(-amount_paise) FILTER (WHERE direction = 'out'), 0)::BIGINT AS spend_paise,
      COUNT(*) FILTER (WHERE direction = 'in'  AND reverses_id IS NULL)::int  AS receipt_count,
      COUNT(*) FILTER (WHERE direction = 'out' AND reverses_id IS NULL)::int  AS expense_count
    FROM ledger_entries
    WHERE value_date >= $1::date
      AND value_date <= $2::date
  ),
  snapshot AS (
    SELECT
      COALESCE(SUM(balance_paise), 0)::BIGINT                        AS outstanding_paise,
      COUNT(*) FILTER (WHERE days_overdue > 0)::int                  AS overdue_count
    FROM v_milestone_balance
    WHERE status = 'active'
      AND balance_paise > 0
  ),
  -- Client requirement: "number of meter installations done on the selected date".
  -- Dated by completed_at - never by end_date, which is a schedule, not a fact.
  --
  -- Matched on milestone_name, the workflow stage the task belongs to. The
  -- original filter tested t.name ILIKE '%meter%' OR t.code ILIKE '%LIA-011%'
  -- and could never match: project_tasks.name is empty on all 9,778 rows, and
  -- code holds a generated task number (TSK-ONEOHM_EPC-YYYY-NNNN) rather than a
  -- workflow code. This KPI therefore reported 0 permanently.
  --
  -- 'Net Metering Application' is deliberately excluded - applying to the DISCOM
  -- is not the same event as the meter going in, and counting both would roughly
  -- double the figure.
  meters AS (
    SELECT COUNT(*)::int AS meter_installations
    FROM project_tasks t
    JOIN projects pr             ON pr.id = t.project_id AND pr.deleted_at IS NULL
    JOIN customer_properties cpr ON cpr.id = pr.property_id
    WHERE t.deleted_at IS NULL
      AND t.status = 'done'
      AND t.completed_at IS NOT NULL
      AND BTRIM(LOWER(t.milestone_name)) LIKE 'net meter installation%'
      AND t.completed_at::date >= $1::date
      AND t.completed_at::date <= $2::date
  ),
  credit AS (
    SELECT COALESCE(SUM(unallocated_paise), 0)::BIGINT AS unallocated_paise
    FROM v_project_balance
  )
  SELECT
    flows.revenue_paise        AS "revenuePaise",
    flows.spend_paise          AS "spendPaise",
    (flows.revenue_paise - flows.spend_paise)::BIGINT AS "netPaise",
    flows.receipt_count        AS "receiptCount",
    flows.expense_count        AS "expenseCount",
    snapshot.outstanding_paise AS "outstandingPaise",
    snapshot.overdue_count     AS "overdueCount",
    credit.unallocated_paise   AS "unallocatedPaise",
    meters.meter_installations AS "meterInstallations"
  FROM flows, snapshot, credit, meters
`;

/**
 * Money in and out per period, keyed on `value_date`.
 *
 * `generate_series` spans the requested range so empty periods appear as zeros
 * rather than being missing — a chart with holes in it reads as lost data.
 * The grain is a parameter, so the same query serves day, week and month.
 */
export const CASH_FLOW_SQL = `
  WITH buckets AS (
    SELECT generate_series(
      date_trunc($3, $1::date),
      date_trunc($3, $2::date),
      ('1 ' || $3)::interval
    ) AS bucket
  )
  SELECT
    to_char(b.bucket, 'YYYY-MM-DD')                                          AS "bucket",
    COALESCE(SUM(e.amount_paise) FILTER (WHERE e.direction = 'in'), 0)::BIGINT  AS "cashInPaise",
    COALESCE(SUM(-e.amount_paise) FILTER (WHERE e.direction = 'out'), 0)::BIGINT AS "cashOutPaise",
    COALESCE(SUM(e.amount_paise), 0)::BIGINT                                  AS "netPaise"
  FROM buckets b
  LEFT JOIN ledger_entries e
    ON date_trunc($3, e.value_date) = b.bucket
  GROUP BY b.bucket
  ORDER BY b.bucket
`;

/** Money out grouped by category, for the selected period. */
export const SPEND_BY_CATEGORY_SQL = `
  SELECT
    COALESCE(category, 'misc')            AS "category",
    SUM(-amount_paise)::BIGINT            AS "totalPaise"
  FROM ledger_entries
  WHERE direction = 'out'
    AND value_date >= $1::date
    AND value_date <= $2::date
  GROUP BY COALESCE(category, 'misc')
  ORDER BY "totalPaise" DESC
`;

/**
 * Who owes us money — a snapshot, not a period figure.
 *
 * Waived milestones are excluded by the view, so a waived residual stops being
 * chased. That contradiction (finance dashboard dropped it, project card kept
 * reporting it) was one of the defects behind this rebuild.
 */
export const TOP_CUSTOMERS_OUTSTANDING_SQL = `
  SELECT
    cp.id                                  AS "customerId",
    NULLIF(TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)), '')                     AS "customerName",
    SUM(v.balance_paise)::BIGINT           AS "outstandingPaise",
    MAX(v.days_overdue)::int               AS "maxDaysOverdue"
  FROM v_milestone_balance v
  JOIN projects pr            ON pr.id = v.project_id AND pr.deleted_at IS NULL
  JOIN customer_properties prop ON prop.id = pr.property_id
  JOIN customer_profiles cp   ON cp.id = prop.customer_id
  WHERE v.status = 'active'
    AND v.balance_paise > 0
  GROUP BY cp.id, cp.first_name, cp.last_name
  ORDER BY "outstandingPaise" DESC
  LIMIT $1
`;

/** Paginated ledger, either direction. Newest by value date first. */
export const LEDGER_PAGE_SQL = `
  SELECT
    e.id, e.entry_no        AS "entryNo",
    e.entry_type            AS "entryType",
    e.direction,
    e.amount_paise          AS "amountPaise",
    to_char(e.value_date, 'YYYY-MM-DD') AS "valueDate",
    e.value_date_is_inferred AS "valueDateIsInferred",
    e.payment_method        AS "paymentMethod",
    e.reference, e.counterparty, e.category, e.notes,
    e.reverses_id           AS "reversesId",
    e.reversal_reason       AS "reversalReason",
    e.created_at            AS "createdAt",
    pr.id                   AS "projectId",
    pr.project_number       AS "projectNumber",
    pr.name                 AS "projectName",
    NULLIF(TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)), '') AS "customerName"
  FROM ledger_entries e
  JOIN projects pr              ON pr.id = e.project_id
  LEFT JOIN customer_properties prop ON prop.id = pr.property_id
  LEFT JOIN customer_profiles cp     ON cp.id = prop.customer_id
  WHERE ($1::text IS NULL OR e.direction = $1)
    AND ($2::date IS NULL OR e.value_date >= $2)
    AND ($3::date IS NULL OR e.value_date <= $3)
    AND ($4::uuid IS NULL OR e.project_id = $4)
    AND ($5::uuid IS NULL OR prop.customer_id = $5)
    AND (
      $6::text IS NULL
      OR e.entry_no     ILIKE '%' || $6 || '%'
      OR e.reference    ILIKE '%' || $6 || '%'
      OR e.counterparty ILIKE '%' || $6 || '%'
      OR pr.project_number ILIKE '%' || $6 || '%'
      OR pr.name        ILIKE '%' || $6 || '%'
      OR TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)) ILIKE '%' || $6 || '%'
    )
  ORDER BY
    -- $7/$8 are whitelisted on the DTO and compared, never interpolated.
    CASE WHEN $7 = 'valueDate'   AND $8 = 'asc'  THEN e.value_date        END ASC,
    CASE WHEN $7 = 'valueDate'   AND $8 = 'desc' THEN e.value_date        END DESC,
    CASE WHEN $7 = 'amountPaise' AND $8 = 'asc'  THEN ABS(e.amount_paise) END ASC,
    CASE WHEN $7 = 'amountPaise' AND $8 = 'desc' THEN ABS(e.amount_paise) END DESC,
    CASE WHEN $7 = 'customerName' AND $8 = 'asc' THEN TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)) END ASC,
    CASE WHEN $7 = 'customerName' AND $8 = 'desc' THEN TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)) END DESC,
    -- Default: newest money first.
    e.value_date DESC, e.created_at DESC
  LIMIT $9 OFFSET $10
`;

export const LEDGER_COUNT_SQL = `
  SELECT COUNT(*)::int AS count
  FROM ledger_entries e
  JOIN projects pr              ON pr.id = e.project_id
  LEFT JOIN customer_properties prop ON prop.id = pr.property_id
  LEFT JOIN customer_profiles cp     ON cp.id = prop.customer_id
  WHERE ($1::text IS NULL OR e.direction = $1)
    AND ($2::date IS NULL OR e.value_date >= $2)
    AND ($3::date IS NULL OR e.value_date <= $3)
    AND ($4::uuid IS NULL OR e.project_id = $4)
    AND ($5::uuid IS NULL OR prop.customer_id = $5)
    AND (
      $6::text IS NULL
      OR e.entry_no     ILIKE '%' || $6 || '%'
      OR e.reference    ILIKE '%' || $6 || '%'
      OR e.counterparty ILIKE '%' || $6 || '%'
      OR pr.project_number ILIKE '%' || $6 || '%'
      OR pr.name        ILIKE '%' || $6 || '%'
      OR TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)) ILIKE '%' || $6 || '%'
    )
`;

/** Every open milestone across the org — the receivables screen. */
/**
 * Open milestones — who owes money, worst overdue first.
 *
 * Filters use the `$n IS NULL OR` idiom so one prepared statement serves every
 * combination. The ageing bucket is computed from `days_overdue` here rather
 * than in the client, so the chip counts, the rows and the total always agree.
 */
const RECEIVABLES_FILTERS = `
  WHERE v.status = 'active'
    AND v.balance_paise > 0
    AND (
      $1::text IS NULL
      OR ($1 = 'current' AND v.days_overdue <= 0)
      OR ($1 = '1-30'    AND v.days_overdue BETWEEN 1 AND 30)
      OR ($1 = '31-60'   AND v.days_overdue BETWEEN 31 AND 60)
      OR ($1 = '61-90'   AND v.days_overdue BETWEEN 61 AND 90)
      OR ($1 = '90plus'  AND v.days_overdue > 90)
    )
    AND (
      $2::text IS NULL
      OR pr.project_number ILIKE '%' || $2 || '%'
      OR pr.name           ILIKE '%' || $2 || '%'
      OR v.name            ILIKE '%' || $2 || '%'
      OR TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)) ILIKE '%' || $2 || '%'
    )
`;

/**
 * Joined in both the page and the count query.
 *
 * The count previously omitted the customer tables; adding a customer-name
 * search without adding them here too would have made "showing 1-25 of N"
 * disagree with the rows actually returned.
 */
const RECEIVABLES_JOINS = `
  FROM v_milestone_balance v
  JOIN projects pr                   ON pr.id = v.project_id AND pr.deleted_at IS NULL
  LEFT JOIN customer_properties prop ON prop.id = pr.property_id
  LEFT JOIN customer_profiles cp     ON cp.id = prop.customer_id
`;

export const RECEIVABLES_SQL = `
  SELECT
    v.milestone_id     AS "milestoneId",
    v.project_id       AS "projectId",
    pr.project_number  AS "projectNumber",
    pr.name            AS "projectName",
    NULLIF(TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)), '') AS "customerName",
    cp.phone           AS "customerPhone",
    v.display_order    AS "displayOrder",
    v.name             AS "milestoneName",
    v.payer_type       AS "payerType",
    v.expected_paise   AS "expectedPaise",
    v.allocated_paise  AS "allocatedPaise",
    v.balance_paise    AS "balancePaise",
    to_char(v.due_date, 'YYYY-MM-DD') AS "dueDate",
    v.days_overdue     AS "daysOverdue",
    v.derived_status   AS "derivedStatus"
  ${RECEIVABLES_JOINS}
  ${RECEIVABLES_FILTERS}
  ORDER BY
    -- $3/$4 are whitelisted on the DTO and compared, never interpolated.
    CASE WHEN $3 = 'daysOverdue'       AND $4 = 'asc'  THEN v.days_overdue   END ASC,
    CASE WHEN $3 = 'daysOverdue'       AND $4 = 'desc' THEN v.days_overdue   END DESC,
    CASE WHEN $3 = 'outstandingAmount' AND $4 = 'asc'  THEN v.balance_paise  END ASC,
    CASE WHEN $3 = 'outstandingAmount' AND $4 = 'desc' THEN v.balance_paise  END DESC,
    CASE WHEN $3 = 'dueDate'           AND $4 = 'asc'  THEN v.due_date       END ASC,
    CASE WHEN $3 = 'dueDate'           AND $4 = 'desc' THEN v.due_date       END DESC,
    CASE WHEN $3 = 'customerName'      AND $4 = 'asc'  THEN TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)) END ASC,
    CASE WHEN $3 = 'customerName'      AND $4 = 'desc' THEN TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)) END DESC,
    -- Default: worst overdue first, which is the order to work the list in.
    v.days_overdue DESC, v.due_date NULLS LAST, pr.project_number
  LIMIT $5 OFFSET $6
`;

export const RECEIVABLES_COUNT_SQL = `
  SELECT COUNT(*)::int AS count
  ${RECEIVABLES_JOINS}
  ${RECEIVABLES_FILTERS}
`;

/** Row counts per ageing bucket, for the quick-filter chips. */
export const RECEIVABLES_BUCKETS_SQL = `
  SELECT
    COUNT(*) FILTER (WHERE v.days_overdue <= 0)                AS "current",
    COUNT(*) FILTER (WHERE v.days_overdue BETWEEN 1 AND 30)    AS "d1to30",
    COUNT(*) FILTER (WHERE v.days_overdue BETWEEN 31 AND 60)   AS "d31to60",
    COUNT(*) FILTER (WHERE v.days_overdue BETWEEN 61 AND 90)   AS "d61to90",
    COUNT(*) FILTER (WHERE v.days_overdue > 90)                AS "d90plus",
    COUNT(*)                                                   AS "all",
    COALESCE(SUM(v.balance_paise), 0)                          AS "totalOutstandingPaise",
    COALESCE(SUM(v.balance_paise) FILTER (WHERE v.days_overdue > 0), 0) AS "overduePaise"
  FROM v_milestone_balance v
  JOIN projects pr ON pr.id = v.project_id AND pr.deleted_at IS NULL
  WHERE v.status = 'active' AND v.balance_paise > 0
`;

/**
 * Customer AR ageing, derived from the ledger.
 *
 * Replaces the `project_payment_terms` version, which could not see any
 * project created after the ledger cutover — conversion writes
 * `payment_milestones` now, so a customer owing money rendered as
 * "OUTSTANDING ₹0 · All settled" on their own Finance tab.
 *
 * Buckets follow AGING_BUCKETS in ../constants. `days_overdue` is 0 when
 * `due_date` is null, so undated milestones land in `current`, matching the
 * legacy definition. Expect the bucket spread to shift noticeably: the ledger
 * carries real due dates (derived from completed workflow stages) where the
 * legacy table had two in total.
 *
 * Amounts are returned in RUPEES because CustomerAgingDto is a rupee contract
 * and three components read it unchanged.
 */
export const CUSTOMERS_AR_SQL = `
  WITH open_ms AS (
    SELECT
      cp.id AS customer_id,
      v.balance_paise,
      v.days_overdue
    FROM v_milestone_balance v
    JOIN projects pr              ON pr.id = v.project_id AND pr.deleted_at IS NULL
    JOIN customer_properties prop ON prop.id = pr.property_id
    JOIN customer_profiles cp     ON cp.id = prop.customer_id AND cp.deleted_at IS NULL
    WHERE v.status = 'active'
      AND v.balance_paise > 0
  ),
  agg AS (
    SELECT
      customer_id,
      SUM(balance_paise)::BIGINT AS total_paise,
      COUNT(*)::int              AS open_term_count,
      COALESCE(SUM(balance_paise) FILTER (WHERE days_overdue <= 0), 0)::BIGINT              AS current_paise,
      COALESCE(SUM(balance_paise) FILTER (WHERE days_overdue BETWEEN 1  AND 30), 0)::BIGINT AS b0_30_paise,
      COALESCE(SUM(balance_paise) FILTER (WHERE days_overdue BETWEEN 31 AND 60), 0)::BIGINT AS b31_60_paise,
      COALESCE(SUM(balance_paise) FILTER (WHERE days_overdue BETWEEN 61 AND 90), 0)::BIGINT AS b61_90_paise,
      COALESCE(SUM(balance_paise) FILTER (WHERE days_overdue > 90), 0)::BIGINT              AS b90_plus_paise
    FROM open_ms
    GROUP BY customer_id
  ),
  last_receipt AS (
    SELECT e.customer_id, MAX(e.value_date) AS last_date
    FROM ledger_entries e
    WHERE e.direction = 'in'
      AND e.reverses_id IS NULL
      AND e.customer_id IS NOT NULL
    GROUP BY e.customer_id
  )
  SELECT
    cp.id                                                         AS "customerId",
    NULLIF(TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)), '') AS "customerName",
    cp.phone                                                      AS "customerPhone",
    cp.email                                                      AS "customerEmail",
    (agg.total_paise    / 100.0)::float8                          AS "totalOutstanding",
    (agg.current_paise  / 100.0)::float8                          AS "current",
    (agg.b0_30_paise    / 100.0)::float8                          AS "bucket0to30",
    (agg.b31_60_paise   / 100.0)::float8                          AS "bucket31to60",
    (agg.b61_90_paise   / 100.0)::float8                          AS "bucket61to90",
    (agg.b90_plus_paise / 100.0)::float8                          AS "bucket90plus",
    lr.last_date                                                  AS "lastReceiptDate",
    agg.open_term_count                                           AS "openTermCount"
  FROM agg
  JOIN customer_profiles cp ON cp.id = agg.customer_id
  LEFT JOIN last_receipt lr ON lr.customer_id = agg.customer_id
  ORDER BY agg.total_paise DESC
  LIMIT $1
`;

/**
 * Open payment terms, derived from the ledger.
 *
 * Shapes rows as OutstandingTermDto so the customer Finance tab renders
 * unchanged. `status` is the view's DERIVED status — the milestone row itself
 * only ever stores `active | waived`, and `cancelled` is never emitted, which
 * `consumer-contract.spec.ts` also depends on.
 *
 * Amounts are RUPEES to match the DTO contract. `createdAt` comes from the
 * milestone row: v_milestone_balance does not expose it.
 */
export const OUTSTANDING_SQL = `
  SELECT
    v.milestone_id    AS "id",
    v.project_id      AS "projectId",
    pr.project_number AS "projectNumber",
    pr.name           AS "projectName",
    cp.id             AS "customerId",
    NULLIF(TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)), '') AS "customerName",
    v.stage,
    v.name,
    to_char(v.due_date, 'YYYY-MM-DD')   AS "dueDate",
    (v.expected_paise  / 100.0)::float8 AS "expectedAmount",
    (v.allocated_paise / 100.0)::float8 AS "paidAmount",
    (v.balance_paise   / 100.0)::float8 AS "outstandingAmount",
    v.derived_status                    AS "status",
    v.days_overdue                      AS "daysOverdue",
    CASE
      WHEN v.days_overdue <= 0              THEN 'current'
      WHEN v.days_overdue BETWEEN 1  AND 30 THEN '0-30'
      WHEN v.days_overdue BETWEEN 31 AND 60 THEN '31-60'
      WHEN v.days_overdue BETWEEN 61 AND 90 THEN '61-90'
      ELSE '90+'
    END                                 AS "agingBucket",
    pm.created_at                       AS "createdAt"
  FROM v_milestone_balance v
  JOIN payment_milestones pm    ON pm.id = v.milestone_id
  JOIN projects pr              ON pr.id = v.project_id AND pr.deleted_at IS NULL
  LEFT JOIN customer_properties prop ON prop.id = pr.property_id
  LEFT JOIN customer_profiles cp     ON cp.id = prop.customer_id
  WHERE v.status = 'active'
    AND v.balance_paise > 0
    AND ($3::uuid IS NULL OR cp.id = $3)
    AND ($4::uuid IS NULL OR v.project_id = $4)
  ORDER BY v.days_overdue DESC, v.due_date NULLS LAST, pr.project_number
  LIMIT $1 OFFSET $2
`;

export const OUTSTANDING_COUNT_SQL = `
  SELECT COUNT(*)::int AS count
  FROM v_milestone_balance v
  JOIN projects pr              ON pr.id = v.project_id AND pr.deleted_at IS NULL
  LEFT JOIN customer_properties prop ON prop.id = pr.property_id
  LEFT JOIN customer_profiles cp     ON cp.id = prop.customer_id
  WHERE v.status = 'active'
    AND v.balance_paise > 0
    AND ($1::uuid IS NULL OR cp.id = $1)
    AND ($2::uuid IS NULL OR v.project_id = $2)
`;

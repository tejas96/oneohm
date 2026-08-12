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
  -- Counted from workflow tasks, dated by completed_at (recovered from the
  -- task activity log in migration 1851000000007) - never by a planned end_date,
  -- which is a schedule, not a fact.
  meters AS (
    SELECT COUNT(*)::int AS meter_installations
    FROM project_tasks t
    JOIN projects pr             ON pr.id = t.project_id AND pr.deleted_at IS NULL
    JOIN customer_properties cpr ON cpr.id = pr.property_id
    WHERE t.deleted_at IS NULL
      AND t.status = 'done'
      AND t.completed_at IS NOT NULL
      AND (t.name ILIKE '%meter%' OR t.code ILIKE '%LIA-011%')
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
  ORDER BY e.value_date DESC, e.created_at DESC
  LIMIT $6 OFFSET $7
`;

export const LEDGER_COUNT_SQL = `
  SELECT COUNT(*)::int AS count
  FROM ledger_entries e
  JOIN projects pr              ON pr.id = e.project_id
  LEFT JOIN customer_properties prop ON prop.id = pr.property_id
  WHERE ($1::text IS NULL OR e.direction = $1)
    AND ($2::date IS NULL OR e.value_date >= $2)
    AND ($3::date IS NULL OR e.value_date <= $3)
    AND ($4::uuid IS NULL OR e.project_id = $4)
    AND ($5::uuid IS NULL OR prop.customer_id = $5)
`;

/** Every open milestone across the org — the receivables screen. */
export const RECEIVABLES_SQL = `
  SELECT
    v.milestone_id     AS "milestoneId",
    v.project_id       AS "projectId",
    pr.project_number  AS "projectNumber",
    pr.name            AS "projectName",
    NULLIF(TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)), '') AS "customerName",
    v.display_order    AS "displayOrder",
    v.name             AS "milestoneName",
    v.payer_type       AS "payerType",
    v.expected_paise   AS "expectedPaise",
    v.allocated_paise  AS "allocatedPaise",
    v.balance_paise    AS "balancePaise",
    to_char(v.due_date, 'YYYY-MM-DD') AS "dueDate",
    v.days_overdue     AS "daysOverdue",
    v.derived_status   AS "derivedStatus"
  FROM v_milestone_balance v
  JOIN projects pr              ON pr.id = v.project_id AND pr.deleted_at IS NULL
  LEFT JOIN customer_properties prop ON prop.id = pr.property_id
  LEFT JOIN customer_profiles cp     ON cp.id = prop.customer_id
  WHERE v.status = 'active'
    AND v.balance_paise > 0
  ORDER BY v.days_overdue DESC, v.due_date NULLS LAST, pr.project_number
  LIMIT $1 OFFSET $2
`;

export const RECEIVABLES_COUNT_SQL = `
  SELECT COUNT(*)::int AS count
  FROM v_milestone_balance v
  JOIN projects pr ON pr.id = v.project_id AND pr.deleted_at IS NULL
  WHERE v.status = 'active' AND v.balance_paise > 0
`;

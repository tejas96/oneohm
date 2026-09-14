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
      COALESCE(SUM(e.amount_paise) FILTER (WHERE e.direction = 'in'), 0)::BIGINT  AS revenue_paise,
      COALESCE(SUM(-e.amount_paise) FILTER (WHERE e.direction = 'out' AND e.is_cash), 0)::BIGINT AS spend_paise,
      COUNT(*) FILTER (WHERE e.direction = 'in'  AND e.reverses_id IS NULL)::int  AS receipt_count,
      COUNT(*) FILTER (WHERE e.direction = 'out' AND e.is_cash AND e.reverses_id IS NULL)::int  AS expense_count
    FROM ledger_entries e
    JOIN projects pr                   ON pr.id = e.project_id
    LEFT JOIN customer_properties prop ON prop.id = pr.property_id
    LEFT JOIN customer_profiles cp     ON cp.id = prop.customer_id
    WHERE e.value_date >= $1::date
      AND e.value_date <= $2::date
      -- Follows the ledger search below, so the period figures describe the
      -- rows on screen. The snapshot block deliberately does not: outstanding
      -- is an as-of-today total and is labelled as such in the UI.
      AND (
        $3::text IS NULL
        OR e.entry_no     ILIKE '%' || $3 || '%'
        OR e.reference    ILIKE '%' || $3 || '%'
        OR e.counterparty ILIKE '%' || $3 || '%'
        OR pr.project_number ILIKE '%' || $3 || '%'
        OR pr.name        ILIKE '%' || $3 || '%'
        OR TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)) ILIKE '%' || $3 || '%'
      )
  ),
  -- The authoritative receivables snapshot.
  --
  -- Deliberately unjoined and unlimited, unlike CUSTOMERS_AR_SQL, which inner
  -- joins projects/properties/customers and caps at 1000 rows. Those joins drop
  -- money owed on a soft-deleted project or by a soft-deleted customer, and the
  -- cap truncates past 1000 customers. Both are correct for a per-customer
  -- breakdown and wrong for an org total, so the total and the overdue figure
  -- are served from here and nothing recomputes them client-side.
  snapshot AS (
    SELECT
      COALESCE(SUM(balance_paise), 0)::BIGINT                        AS outstanding_paise,
      COUNT(*) FILTER (WHERE days_overdue > 0)::int                  AS overdue_count,
      COALESCE(SUM(balance_paise) FILTER (WHERE days_overdue > 0), 0)::BIGINT AS overdue_paise
    FROM v_milestone_balance
    WHERE status = 'active'
      AND balance_paise > 0
  ),
  -- How many projects had their net meter commissioned in this period.
  --
  -- Counts PROJECTS, not tasks. The predicate that used to live here inline
  -- counted rows in project_tasks, so a project whose workflow carries the
  -- stage name on more than one task was counted once per task: 65 all-time
  -- against 41 projects, because 26 projects carry several. A project has one
  -- net meter. Expect this tile to read ~38% lower than it used to, and to be
  -- right for the first time.
  --
  -- It also now shares its definition with the Recovery scope on Receivables,
  -- so the two can never drift.
  --
  -- One project is missing from every dated period on purpose: its meter task
  -- predates activity logging and has no completed_at, so the view reports
  -- meter_dated = false. A completion we cannot evidence is not one we count —
  -- the same rule 08-task-completion.sql.ts already states.
  meters AS (
    SELECT COUNT(*)::int AS meter_installations
    FROM v_project_commissioning c
    JOIN projects pr ON pr.id = c.project_id AND pr.deleted_at IS NULL
    WHERE c.meter_completed_at::date >= $1::date
      AND c.meter_completed_at::date <= $2::date
  ),
  -- What WE owe, so the page that shows money owed to us shows both directions.
  -- A snapshot as of today, like outstanding — a debt does not belong to a month.
  payable AS (
    SELECT COALESCE(SUM(payable_paise) FILTER (WHERE payable_paise > 0), 0)::BIGINT AS vendor_payable_paise
    FROM v_vendor_payable
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
    snapshot.overdue_paise     AS "overduePaise",
    credit.unallocated_paise   AS "unallocatedPaise",
    meters.meter_installations AS "meterInstallations",
    payable.vendor_payable_paise AS "vendorPayablePaise"
  FROM flows, snapshot, credit, meters, payable
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
    COALESCE(SUM(-e.amount_paise) FILTER (WHERE e.direction = 'out' AND e.is_cash), 0)::BIGINT AS "cashOutPaise",
    -- Net must equal cashIn - cashOut on this same row. is_cash is enforced
    -- true on every 'in' row (chk_ledger_entries_credit_is_out), so filtering
    -- this SUM on is_cash alone keeps all revenue and only cash spend: a bill
    -- on credit cannot silently shrink "net cash" while being excluded from the
    -- cash-out bar right next to it on the same chart.
    COALESCE(SUM(e.amount_paise) FILTER (WHERE e.is_cash), 0)::BIGINT         AS "netPaise"
  FROM buckets b
  LEFT JOIN ledger_entries e
    ON date_trunc($3, e.value_date) = b.bucket
  GROUP BY b.bucket
  ORDER BY b.bucket
`;

/** Money out grouped by category, for the selected period. */
export const SPEND_BY_CATEGORY_SQL = `
  SELECT
    ledger_norm_category(category)        AS "category",
    SUM(-amount_paise)::BIGINT            AS "totalPaise"
  FROM ledger_entries
  WHERE direction = 'out'
    AND is_cash
    AND value_date >= $1::date
    AND value_date <= $2::date
  GROUP BY ledger_norm_category(category)
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
    e.reference, e.counterparty, e.notes,
    e.is_cash                     AS "isCash",
    e.vendor_id                   AS "vendorId",
    vn.name                       AS "vendorName",
    -- Only an expense has a category. ledger_norm_category turns NULL into
    -- 'uncategorised', which on a receipt, refund or vendor payment replaced the
    -- payment method the Detail column falls back to ("upi · UTR-…").
    CASE WHEN e.entry_type = 'expense' THEN ledger_norm_category(e.category) END AS "category",
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
  LEFT JOIN vendors vn               ON vn.id = e.vendor_id
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
      OR ($1 = 'current'     AND v.days_overdue <= 0)
      OR ($1 = '1-30'        AND v.days_overdue BETWEEN 1 AND 30)
      OR ($1 = '31-60'       AND v.days_overdue BETWEEN 31 AND 60)
      OR ($1 = '61-90'       AND v.days_overdue BETWEEN 61 AND 90)
      OR ($1 = '90plus'      AND v.days_overdue > 90)
      OR ($1 = 'no_due_date' AND v.due_date IS NULL)
    )
    AND (
      $2::text IS NULL
      OR pr.project_number ILIKE '%' || $2 || '%'
      OR pr.name           ILIKE '%' || $2 || '%'
      OR v.name            ILIKE '%' || $2 || '%'
      OR TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)) ILIKE '%' || $2 || '%'
    )
    -- $3 scope: 'recovery' keeps only projects whose net meter is installed —
    -- the job is delivered and the money is still open.
    AND ($3::text IS NULL OR $3 <> 'recovery' OR com.project_id IS NOT NULL)
    -- $4 funding: COALESCE on the cash branch so a milestone whose project has
    -- no property row still appears in one segment. Money in neither tab is
    -- worse than money in the wrong one.
    AND (
      $4::text IS NULL
      OR ($4 = 'loan' AND prop.wants_loan = true)
      OR ($4 = 'cash' AND COALESCE(prop.wants_loan, false) = false)
    )
`;

/**
 * Joined in both the page and the count query.
 *
 * The count previously omitted the customer tables; adding a customer-name
 * search without adding them here too would have made "showing 1-25 of N"
 * disagree with the rows actually returned.
 *
 * `v_project_commissioning` is a LEFT join, not an inner one, so the default
 * `scope = all` is unaffected. The `recovery` scope is expressed as a
 * predicate in RECEIVABLES_FILTERS rather than by swapping join types, so
 * this one join clause serves every query.
 */
const RECEIVABLES_JOINS = `
  FROM v_milestone_balance v
  JOIN projects pr                   ON pr.id = v.project_id AND pr.deleted_at IS NULL
  LEFT JOIN customer_properties prop ON prop.id = pr.property_id
  LEFT JOIN customer_profiles cp     ON cp.id = prop.customer_id
  LEFT JOIN v_project_commissioning com ON com.project_id = pr.id
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
    v.derived_status   AS "derivedStatus",
    -- Added for AttachBankDialog's caller (Task 15): RECEIVABLES_JOINS's
    -- LEFT JOIN means this is NULL only when the project itself has no
    -- property row, which cannot happen for a wantsLoan row -- wants_loan
    -- lives on prop, so a true value implies prop matched.
    prop.id                                          AS "propertyId",
    COALESCE(prop.wants_loan, false)                AS "wantsLoan",
    prop.financing_bank                             AS "financingBank",
    to_char(com.meter_completed_at, 'YYYY-MM-DD')   AS "meterCompletedAt",
    -- NULL, never 0, when there is no meter date yet — zero would read as
    -- "commissioned today" on a project commissioned months ago.
    CASE WHEN com.meter_completed_at IS NULL THEN NULL
         ELSE (CURRENT_DATE - com.meter_completed_at::date)::int
    END                                             AS "daysSinceMeter"
  ${RECEIVABLES_JOINS}
  ${RECEIVABLES_FILTERS}
  ORDER BY
    -- $5/$6 are whitelisted on the DTO and compared, never interpolated.
    CASE WHEN $5 = 'daysOverdue'       AND $6 = 'asc'  THEN v.days_overdue   END ASC,
    CASE WHEN $5 = 'daysOverdue'       AND $6 = 'desc' THEN v.days_overdue   END DESC,
    CASE WHEN $5 = 'outstandingAmount' AND $6 = 'asc'  THEN v.balance_paise  END ASC,
    CASE WHEN $5 = 'outstandingAmount' AND $6 = 'desc' THEN v.balance_paise  END DESC,
    CASE WHEN $5 = 'dueDate'           AND $6 = 'asc'  THEN v.due_date       END ASC,
    CASE WHEN $5 = 'dueDate'           AND $6 = 'desc' THEN v.due_date       END DESC,
    CASE WHEN $5 = 'customerName'      AND $6 = 'asc'  THEN LOWER(TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name))) END ASC,
    CASE WHEN $5 = 'customerName'      AND $6 = 'desc' THEN LOWER(TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name))) END DESC,
    -- Default: worst overdue first, which is the order to work the list in.
    v.days_overdue DESC, v.due_date NULLS LAST, pr.project_number
  LIMIT $7 OFFSET $8
`;

export const RECEIVABLES_COUNT_SQL = `
  SELECT COUNT(*)::int AS count
  ${RECEIVABLES_JOINS}
  ${RECEIVABLES_FILTERS}
`;

/**
 * Bucket counts and money totals for the chips and the KPI cards.
 *
 * Honours `search` but NOT `bucket`: search narrows the whole page, so the
 * headline totals must follow it or they claim a filtered list is worth the
 * org-wide figure. The bucket is deliberately ignored, because selecting one
 * chip must not zero the counts on the others.
 *
 * `scope` and `funding` ARE honoured here, so the chips describe the list
 * actually on screen.
 *
 * IMPORTANT: this query does NOT share RECEIVABLES_FILTERS and its
 * placeholders are numbered independently of RECEIVABLES_SQL /
 * RECEIVABLES_COUNT_SQL above. Here $1 is `search` (bucket is never a
 * parameter of this query at all), $2 is `scope`, $3 is `funding`.
 */
export const RECEIVABLES_BUCKETS_SQL = `
  SELECT
    COUNT(*) FILTER (WHERE v.days_overdue <= 0)                AS "current",
    COUNT(*) FILTER (WHERE v.days_overdue BETWEEN 1 AND 30)    AS "d1to30",
    COUNT(*) FILTER (WHERE v.days_overdue BETWEEN 31 AND 60)   AS "d31to60",
    COUNT(*) FILTER (WHERE v.days_overdue BETWEEN 61 AND 90)   AS "d61to90",
    COUNT(*) FILTER (WHERE v.days_overdue > 90)                AS "d90plus",
    COUNT(*)                                                   AS "all",
    COALESCE(SUM(v.balance_paise), 0)::BIGINT                  AS "totalOutstandingPaise",
    COALESCE(SUM(v.balance_paise) FILTER (WHERE v.days_overdue > 0), 0)::BIGINT AS "overduePaise",
    COUNT(*) FILTER (WHERE v.due_date IS NULL)                          AS "noDueDate",
    COALESCE(SUM(v.balance_paise) FILTER (WHERE v.due_date IS NULL), 0)::BIGINT AS "noDueDatePaise",
    COUNT(DISTINCT pr.id)                                              AS "recoveryProjects",
    -- Defect 5: a loan project with no lender milestone means the customer is
    -- being chased for the bank's share. Counted, never repaired — a 10/70/20
    -- guess would silently move money off a customer's name.
    COUNT(DISTINCT pr.id) FILTER (
      WHERE COALESCE(prop.wants_loan, false)
        AND NOT EXISTS (SELECT 1 FROM payment_milestones m2
                         WHERE m2.project_id = pr.id AND m2.payer_type = 'lender')
    )                                                                  AS "missingLenderProjects"
  ${RECEIVABLES_JOINS}
  WHERE v.status = 'active'
    AND v.balance_paise > 0
    AND (
      $1::text IS NULL
      OR pr.project_number ILIKE '%' || $1 || '%'
      OR pr.name           ILIKE '%' || $1 || '%'
      OR v.name            ILIKE '%' || $1 || '%'
      OR TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)) ILIKE '%' || $1 || '%'
    )
    AND ($2::text IS NULL OR $2 <> 'recovery' OR com.project_id IS NOT NULL)
    AND (
      $3::text IS NULL
      OR ($3 = 'loan' AND prop.wants_loan = true)
      OR ($3 = 'cash' AND COALESCE(prop.wants_loan, false) = false)
    )
`;

/**
 * Recovery, one row per project: the net meter is in and money is still open.
 *
 * The milestone list (`RECEIVABLES_SQL` with scope=recovery) showed a job once
 * per open milestone, so one customer to call took up to four rows and the
 * list's length was not the number of calls to make. This groups the SAME
 * rows — identical `v_milestone_balance` filters, commissioning join and
 * funding split — so a project's `outstanding_paise` is exactly the sum of the
 * milestone rows it replaces, and the totals match the milestone scope.
 *
 * Search matches customer and project only. Matching a milestone name inside
 * a GROUP BY would drop the project's other milestones from its total.
 *
 * $1 funding ('cash' | 'loan' | NULL), $2 search.
 */
const RECOVERY_PROJECTS_CTE = `
  WITH open_ms AS (
    SELECT v.project_id, v.balance_paise, v.days_overdue, v.due_date
      FROM v_milestone_balance v
     WHERE v.status = 'active'
       AND v.balance_paise > 0
  ),
  recovery AS (
    SELECT
      pr.id                                                          AS project_id,
      pr.project_number,
      pr.name                                                        AS project_name,
      NULLIF(TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)), '')  AS customer_name,
      cp.phone                                                       AS customer_phone,
      prop.id                                                        AS property_id,
      COALESCE(prop.wants_loan, false)                               AS wants_loan,
      prop.financing_bank,
      com.meter_completed_at,
      -- NULL, never 0, when there is no meter date — see RECEIVABLES_SQL.
      CASE WHEN com.meter_completed_at IS NULL THEN NULL
           ELSE (CURRENT_DATE - com.meter_completed_at::date)::int
      END                                                            AS days_since_meter,
      COUNT(*)::int                                                  AS open_milestones,
      SUM(o.balance_paise)::BIGINT                                   AS outstanding_paise,
      COALESCE(SUM(o.balance_paise) FILTER (WHERE o.days_overdue > 0), 0)::BIGINT
                                                                     AS overdue_paise,
      -- The oldest overdue milestone decides the project's ageing bucket.
      MAX(o.days_overdue)::int                                       AS worst_days_overdue,
      COUNT(*) FILTER (WHERE o.due_date IS NULL)::int                AS undated_milestones,
      COALESCE(SUM(o.balance_paise) FILTER (WHERE o.due_date IS NULL), 0)::BIGINT
                                                                     AS undated_paise,
      EXISTS (SELECT 1 FROM payment_milestones m2
               WHERE m2.project_id = pr.id AND m2.payer_type = 'lender')
                                                                     AS has_lender_milestone
    FROM open_ms o
    JOIN projects pr                   ON pr.id = o.project_id AND pr.deleted_at IS NULL
    JOIN v_project_commissioning com   ON com.project_id = pr.id
    LEFT JOIN customer_properties prop ON prop.id = pr.property_id
    LEFT JOIN customer_profiles cp     ON cp.id = prop.customer_id
    WHERE (
            $1::text IS NULL
            OR ($1 = 'loan' AND prop.wants_loan = true)
            OR ($1 = 'cash' AND COALESCE(prop.wants_loan, false) = false)
          )
      AND (
            $2::text IS NULL
            OR pr.project_number ILIKE '%' || $2 || '%'
            OR pr.name           ILIKE '%' || $2 || '%'
            OR TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)) ILIKE '%' || $2 || '%'
          )
    GROUP BY pr.id, pr.project_number, pr.name, cp.first_name, cp.last_name, cp.phone,
             prop.id, prop.wants_loan, prop.financing_bank, com.meter_completed_at
  )
`;

/** $3 bucket — by the project's WORST overdue milestone, or any undated money. */
const RECOVERY_BUCKET_FILTER = `
  WHERE (
    $3::text IS NULL
    OR ($3 = 'current'     AND worst_days_overdue <= 0)
    OR ($3 = '1-30'        AND worst_days_overdue BETWEEN 1 AND 30)
    OR ($3 = '31-60'       AND worst_days_overdue BETWEEN 31 AND 60)
    OR ($3 = '61-90'       AND worst_days_overdue BETWEEN 61 AND 90)
    OR ($3 = '90plus'      AND worst_days_overdue > 90)
    OR ($3 = 'no_due_date' AND undated_milestones > 0)
  )
`;

export const RECOVERY_PAGE_SQL = `
  ${RECOVERY_PROJECTS_CTE}
  SELECT
    project_id                                  AS "projectId",
    project_number                              AS "projectNumber",
    project_name                                AS "projectName",
    customer_name                               AS "customerName",
    customer_phone                              AS "customerPhone",
    property_id                                 AS "propertyId",
    wants_loan                                  AS "wantsLoan",
    financing_bank                              AS "financingBank",
    to_char(meter_completed_at, 'YYYY-MM-DD')   AS "meterCompletedAt",
    days_since_meter                            AS "daysSinceMeter",
    open_milestones                             AS "openMilestones",
    outstanding_paise                           AS "outstandingPaise",
    overdue_paise                               AS "overduePaise",
    worst_days_overdue                          AS "worstDaysOverdue",
    undated_paise                               AS "undatedPaise",
    has_lender_milestone                        AS "hasLenderMilestone"
  FROM recovery
  ${RECOVERY_BUCKET_FILTER}
  ORDER BY
    -- $4/$5 are whitelisted on the DTO and compared, never interpolated.
    CASE WHEN $4 = 'daysSinceMeter'   AND $5 = 'asc'  THEN days_since_meter   END ASC NULLS LAST,
    CASE WHEN $4 = 'daysSinceMeter'   AND $5 = 'desc' THEN days_since_meter   END DESC NULLS LAST,
    CASE WHEN $4 = 'outstanding'      AND $5 = 'asc'  THEN outstanding_paise  END ASC,
    CASE WHEN $4 = 'outstanding'      AND $5 = 'desc' THEN outstanding_paise  END DESC,
    CASE WHEN $4 = 'worstDaysOverdue' AND $5 = 'asc'  THEN worst_days_overdue END ASC,
    CASE WHEN $4 = 'worstDaysOverdue' AND $5 = 'desc' THEN worst_days_overdue END DESC,
    -- LOWER: a name typed in lower case must not sort after every capital.
    CASE WHEN $4 = 'customerName'     AND $5 = 'asc'  THEN LOWER(customer_name) END ASC NULLS LAST,
    CASE WHEN $4 = 'customerName'     AND $5 = 'desc' THEN LOWER(customer_name) END DESC NULLS LAST,
    -- Default: worst overdue first, then the biggest amount.
    worst_days_overdue DESC, outstanding_paise DESC, project_number
  LIMIT $6 OFFSET $7
`;

export const RECOVERY_COUNT_SQL = `
  ${RECOVERY_PROJECTS_CTE}
  SELECT COUNT(*)::int AS count
  FROM recovery
  ${RECOVERY_BUCKET_FILTER}
`;

/**
 * Chip counts (projects, by worst overdue) and the money totals. Follows
 * funding and search ($1, $2) but never the bucket, so picking one chip does
 * not zero the others — the rule `RECEIVABLES_BUCKETS_SQL` follows.
 */
export const RECOVERY_BUCKETS_SQL = `
  ${RECOVERY_PROJECTS_CTE}
  SELECT
    COUNT(*) FILTER (WHERE worst_days_overdue <= 0)::int               AS "current",
    COUNT(*) FILTER (WHERE worst_days_overdue BETWEEN 1 AND 30)::int   AS "d1to30",
    COUNT(*) FILTER (WHERE worst_days_overdue BETWEEN 31 AND 60)::int  AS "d31to60",
    COUNT(*) FILTER (WHERE worst_days_overdue BETWEEN 61 AND 90)::int  AS "d61to90",
    COUNT(*) FILTER (WHERE worst_days_overdue > 90)::int               AS "d90plus",
    COUNT(*)::int                                                      AS "all",
    COALESCE(SUM(outstanding_paise), 0)::BIGINT                        AS "totalOutstandingPaise",
    COALESCE(SUM(overdue_paise), 0)::BIGINT                            AS "overduePaise",
    COUNT(*) FILTER (WHERE undated_milestones > 0)::int                AS "noDueDateProjects",
    COALESCE(SUM(undated_paise), 0)::BIGINT                            AS "noDueDatePaise",
    -- Defect 5, per project: a loan job with no lender milestone means the
    -- customer is being chased for the bank's share.
    COUNT(*) FILTER (WHERE wants_loan AND NOT has_lender_milestone)::int AS "missingLenderProjects"
  FROM recovery
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

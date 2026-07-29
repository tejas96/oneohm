/**
 * The read model. These two views are the ONLY definition of "outstanding".
 *
 * Today that word is defined at least eight different ways across
 * `finance-aggregation.service.ts`, `receipt.service.ts`,
 * `payment.repository.ts` and the frontend — and two endpoints for the same
 * project return contradictory numbers. Everything reads from here instead.
 *
 * ⚠️ `SUM(bigint)` returns `numeric` in Postgres, and node-postgres hands
 * `numeric` to JS as a **string**. Every aggregate below is explicitly cast back
 * to `::BIGINT` so `paiseTransformer` receives an integer-shaped value. Dropping
 * one of these casts reintroduces exactly the decimals-as-strings bug this
 * rebuild exists to remove.
 */

/**
 * Per-milestone balance. `derived_status` mirrors `derivedMilestoneStatus()` in
 * `modules/ledger/domain/derived-status.ts`; `derived-status.spec.ts` pins the
 * table of outcomes so the SQL and the TS cannot drift apart silently.
 *
 * This view is literally the client's requirement: "milestone 1 expects ₹10,000,
 * customer paid ₹2,000, flag that he is ₹8,000 short".
 */
export const CREATE_V_MILESTONE_BALANCE = `
  CREATE OR REPLACE VIEW v_milestone_balance AS
  SELECT
    m.id                                              AS milestone_id,
    m.project_id,
    m.organization_id,
    m.display_order,
    m.name,
    m.stage,
    m.status,
    m.payer_type,
    m.due_date,
    m.amount_paise                                    AS expected_paise,
    COALESCE(a.allocated_paise, 0)::BIGINT            AS allocated_paise,
    GREATEST(m.amount_paise - COALESCE(a.allocated_paise, 0), 0)::BIGINT AS balance_paise,
    GREATEST(COALESCE(a.allocated_paise, 0) - m.amount_paise, 0)::BIGINT AS over_allocated_paise,
    CASE
      WHEN m.status = 'waived'                                THEN 'waived'
      WHEN COALESCE(a.allocated_paise, 0) <= 0                THEN 'pending'
      WHEN COALESCE(a.allocated_paise, 0) >= m.amount_paise   THEN 'paid'
      ELSE 'partial'
    END                                               AS derived_status,
    CASE
      WHEN m.status = 'active'
       AND m.due_date IS NOT NULL
       AND m.due_date < CURRENT_DATE
       AND COALESCE(a.allocated_paise, 0) < m.amount_paise
      THEN (CURRENT_DATE - m.due_date)::int
      ELSE 0
    END                                               AS days_overdue,
    COALESCE(a.entry_count, 0)::int                   AS entry_count
  FROM payment_milestones m
  LEFT JOIN LATERAL (
    SELECT SUM(al.amount_paise)::BIGINT     AS allocated_paise,
           COUNT(DISTINCT al.entry_id)::int AS entry_count
      FROM ledger_allocations al
     WHERE al.milestone_id = m.id
  ) a ON TRUE
`;

/**
 * Per-project rollup. A milestone-scoped view cannot answer project-level
 * questions, and in particular cannot express **unallocated cash**.
 *
 * `unallocated_paise` is money received but not attributed to any milestone —
 * genuine customer credit (overpayment, or a booking advance taken before the
 * schedule existed). It must be surfaced in the UI: an invisible credit balance
 * is how you end up back where this rebuild started.
 *
 * `contract_paise` counts ALL milestones (what was agreed);
 * `expected_paise` counts only active ones (what is still collectable).
 * Org and customer come via `customer_properties` because `projects` has no
 * `organization_id` column of its own.
 */
export const CREATE_V_PROJECT_BALANCE = `
  CREATE OR REPLACE VIEW v_project_balance AS
  SELECT
    p.id                                              AS project_id,
    cp.organization_id,
    cp.customer_id,
    COALESCE(ms.contract_paise, 0)::BIGINT            AS contract_paise,
    COALESCE(ms.expected_paise, 0)::BIGINT            AS expected_paise,
    COALESCE(ms.waived_paise,   0)::BIGINT            AS waived_paise,
    COALESCE(le.received_paise, 0)::BIGINT            AS received_paise,
    COALESCE(le.spent_paise,    0)::BIGINT            AS spent_paise,
    -- Summed from the MILESTONE view, not recomputed here. Subtracting all
    -- project allocations from active-milestone expected re-credits a waived
    -- milestone's receipts against the remaining ones: waive a partially-paid
    -- milestone and the project's outstanding silently drops by what was paid
    -- into it. Deriving from balance_paise makes the two views incapable of
    -- disagreeing.
    COALESCE(msb.outstanding_paise, 0)::BIGINT        AS outstanding_paise,
    GREATEST(COALESCE(le.received_paise, 0) - COALESCE(al.allocated_paise, 0), 0)::BIGINT
                                                      AS unallocated_paise,
    (COALESCE(le.received_paise, 0) - COALESCE(le.spent_paise, 0))::BIGINT
                                                      AS net_cash_paise,
    COALESCE(le.receipt_count,   0)::int              AS receipt_count,
    COALESCE(ms.milestone_count, 0)::int              AS milestone_count
  FROM projects p
  JOIN customer_properties cp ON cp.id = p.property_id
  LEFT JOIN LATERAL (
    SELECT SUM(m.amount_paise)::BIGINT                                  AS contract_paise,
           SUM(m.amount_paise) FILTER (WHERE m.status = 'active')::BIGINT AS expected_paise,
           SUM(m.amount_paise) FILTER (WHERE m.status = 'waived')::BIGINT AS waived_paise,
           COUNT(*)::int                                                AS milestone_count
      FROM payment_milestones m WHERE m.project_id = p.id
  ) ms ON TRUE
  LEFT JOIN LATERAL (
    SELECT SUM(e.amount_paise) FILTER (WHERE e.direction = 'in')::BIGINT  AS received_paise,
           -- NEGATED: money out is stored as a negative amount, so summing it
           -- raw yields a negative "spend" and then received-minus-spent ADDS the
           -- expenditure to net cash. KPIS_SQL already negates; these two must
           -- agree or the dashboard and the project page report different money.
           SUM(-e.amount_paise) FILTER (WHERE e.direction = 'out')::BIGINT AS spent_paise,
           COUNT(*) FILTER (WHERE e.direction = 'in' AND e.reverses_id IS NULL)::int
                                                                          AS receipt_count
      FROM ledger_entries e WHERE e.project_id = p.id
  ) le ON TRUE
  LEFT JOIN LATERAL (
    SELECT SUM(a.amount_paise)::BIGINT AS allocated_paise
      FROM ledger_allocations a WHERE a.project_id = p.id
  ) al ON TRUE
  LEFT JOIN LATERAL (
    SELECT SUM(b.balance_paise)::BIGINT AS outstanding_paise
      FROM v_milestone_balance b
     WHERE b.project_id = p.id AND b.status = 'active'
  ) msb ON TRUE
  WHERE p.deleted_at IS NULL
`;

export const CREATE_LEDGER_VIEWS: string[] = [CREATE_V_MILESTONE_BALANCE, CREATE_V_PROJECT_BALANCE];

export const DROP_LEDGER_VIEWS: string[] = [
  `DROP VIEW IF EXISTS v_project_balance`,
  `DROP VIEW IF EXISTS v_milestone_balance`,
];

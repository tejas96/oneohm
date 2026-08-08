/**
 * The three ledger views, rebuilt without `organization_id`.
 *
 * Each definition below is the CURRENT one, which is not always the earliest:
 *   v_milestone_balance    <- sql/ledger/06-views.sql.ts
 *   v_milestone_completion <- sql/ledger/11-milestone-stage-mapping.sql.ts  (supersedes 08)
 *   v_project_balance      <- sql/ledger/12-contract-composition.sql.ts     (supersedes 06)
 *
 * Copying v_project_balance from 06 instead of 12 would silently drop
 * `quoted_paise` and `change_order_paise` — the columns the project list and the
 * Money tab reconcile against. Only the organization lines were removed; every
 * other character is unchanged from the source.
 */

/** From sql/ledger/06-views.sql.ts, minus `m.organization_id`. */
export const CREATE_V_MILESTONE_BALANCE_V2 = `
  CREATE VIEW v_milestone_balance AS
  SELECT
    m.id                                              AS milestone_id,
    m.project_id,
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

/** From sql/ledger/11-milestone-stage-mapping.sql.ts, minus the three org references. */
export const CREATE_V_MILESTONE_COMPLETION_V2 = `
  CREATE VIEW v_milestone_completion AS
  WITH m AS (
    SELECT
      pm.id, pm.project_id, pm.name, pm.stage,
      COALESCE(
        NULLIF(btrim(pm.due_basis_stage), ''),
        fn_payment_stage_work_key(pm.stage)
      ) AS work_stage_key
    FROM payment_milestones pm
  )
  SELECT
    m.id                                                 AS milestone_id,
    m.project_id,
    m.name,
    m.stage,
    m.work_stage_key,
    COUNT(t.id)::int                                     AS total_tasks,
    COUNT(t.id) FILTER (WHERE t.status = 'done')::int    AS done_tasks,
    (COUNT(t.id) > 0
      AND COUNT(t.id) = COUNT(t.id) FILTER (WHERE t.status = 'done')) AS is_complete,
    MAX(t.completed_at) FILTER (WHERE t.status = 'done') AS completed_at
  FROM m
  LEFT JOIN project_tasks t
    ON  t.project_id = m.project_id
    AND t.deleted_at IS NULL
    AND m.work_stage_key IS NOT NULL
    AND fn_work_stage_key(t.milestone_name) = m.work_stage_key
  GROUP BY m.id, m.project_id, m.name, m.stage, m.work_stage_key
`;

/** From sql/ledger/12-contract-composition.sql.ts, minus `cp.organization_id`. */
export const CREATE_V_PROJECT_BALANCE_V2 = `
  CREATE VIEW v_project_balance AS
  SELECT
    p.id                                              AS project_id,
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
    COALESCE(ms.milestone_count, 0)::int              AS milestone_count,
    -- What the signed quote put on the contract.
    COALESCE(ms.quoted_paise, 0)::BIGINT              AS quoted_paise,
    -- Everything agreed after signing. Manual milestones count here too: like a
    -- change order, they are scope added outside the original quote.
    COALESCE(ms.change_order_paise, 0)::BIGINT        AS change_order_paise
  FROM projects p
  JOIN customer_properties cp ON cp.id = p.property_id
  LEFT JOIN LATERAL (
    SELECT SUM(m.amount_paise)::BIGINT                                  AS contract_paise,
           SUM(m.amount_paise) FILTER (WHERE m.source = 'quote_snapshot')::BIGINT
                                                                        AS quoted_paise,
           SUM(m.amount_paise) FILTER (WHERE m.source <> 'quote_snapshot')::BIGINT
                                                                        AS change_order_paise,
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

export const ORG_CLEANUP_DROP_VIEWS: string[] = [
  // v_project_balance selects from v_milestone_balance, so it goes first.
  `DROP VIEW IF EXISTS v_project_balance`,
  `DROP VIEW IF EXISTS v_milestone_completion`,
  `DROP VIEW IF EXISTS v_milestone_balance`,
];

/**
 * Re-asserts the invariant migration 12 established. The view was rebuilt by
 * hand here, so the cheapest proof that the rebuild is faithful is to check the
 * property the original migration checked.
 */
const ASSERT_CONTRACT_COMPOSITION = `
  DO $$
  DECLARE bad INT;
  BEGIN
    SELECT COUNT(*) INTO bad
      FROM v_project_balance
     WHERE contract_paise <> quoted_paise + change_order_paise;
    IF bad > 0 THEN
      RAISE EXCEPTION 'org-cleanup: quoted + change_orders <> contract on % project(s)', bad;
    END IF;
  END $$
`;

export const ORG_CLEANUP_CREATE_VIEWS: string[] = [
  CREATE_V_MILESTONE_BALANCE_V2,
  CREATE_V_MILESTONE_COMPLETION_V2,
  CREATE_V_PROJECT_BALANCE_V2,
  ASSERT_CONTRACT_COMPOSITION,
];

/**
 * v_project_balance, second edition. Three changes, no others.
 *
 * SOURCED FROM sql/org-cleanup/04-views.sql.ts's (internal, unexported)
 * `CREATE_V_PROJECT_BALANCE_V2`, NOT from sql/ledger/12-contract-composition.sql.ts
 * and NOT from sql/ledger/06-views.sql.ts. Both of those are stale:
 *
 *   - `06-views.sql.ts`'s `CREATE_V_PROJECT_BALANCE` still selects the
 *     `cp.organization_id` column that RemoveOrganizations1852000000000 dropped
 *     two migrations later, and lacks `cancelled_paise`, `refunded_paise`,
 *     `quoted_paise` and `change_order_paise` entirely.
 *   - `12-contract-composition.sql.ts`'s definition is the one that FIRST added
 *     `quoted_paise` / `change_order_paise` — but it still carries
 *     `cp.organization_id`, and it predates both `MilestoneCancelledStatus`
 *     (`cancelled_paise`) and `SplitRefundsOutOfSpend` (`refunded_paise`).
 *
 * The database this migration actually runs against has gone through org
 * cleanup AND both of those later migrations — confirmed directly against the
 * live `oneohm-postgres` container: `information_schema.columns` for
 * `v_project_balance` returns exactly 16 columns, in this order — project_id,
 * customer_id, contract_paise, expected_paise, waived_paise, cancelled_paise,
 * received_paise, spent_paise, refunded_paise, outstanding_paise,
 * unallocated_paise, net_cash_paise, receipt_count, milestone_count,
 * quoted_paise, change_order_paise — and `pg_get_viewdef` matches
 * `sql/org-cleanup/04-views.sql.ts`'s `CREATE_V_PROJECT_BALANCE_V2` body
 * expression-for-expression. Building V2 on top of anything else means
 * `CREATE OR REPLACE VIEW` either fails outright (wrong column at position 2)
 * or silently drops `cancelled_paise` / `refunded_paise` — the exact failure
 * mode this file's own header warns against, just pointed at the wrong column.
 *
 * `CREATE_V_PROJECT_BALANCE_V1` below is a byte-for-byte copy of that live
 * definition (verified against `pg_get_viewdef` on the running database), kept
 * here — rather than imported from `sql/org-cleanup/04-views.sql.ts` — for two
 * reasons: that file exports it, unexported, only as an internal `const`, and
 * more importantly this task's own file list does not include modifying a
 * migration file that has already run in production. Duplicating sixteen lines
 * is cheaper than editing history.
 *
 * The three changes:
 *
 * 1. `waived_paise` was SUM(expected) over waived milestones, so anything
 *    collected before the waiver was counted twice — once in received, once in
 *    waived. On PRJ-ONEOHM_EPC-2026-0225 that reported Rs 1,44,483.89 written off
 *    against a Rs 1,60,537.66 contract on which Rs 30,000 had been collected:
 *    Rs 30,000 more than the contract in total. It now sums `balance_paise` from
 *    v_milestone_balance, i.e. the UNPAID remainder, and the project cross-foots.
 *
 * 2. `spent_paise` gains `AND e.is_cash = true`, so a bill taken on credit is
 *    never reported as cash gone. This is layered ONTO the existing
 *    `entry_type <> 'refund'` filter that `SplitRefundsOutOfSpend1857030000000`
 *    already put there — dropping that filter would silently resurrect the bug
 *    that migration fixed (a cancelled project's refund reported as spend).
 *    `net_cash_paise` is unchanged in formula and therefore becomes true cash,
 *    which its name always claimed.
 *
 * 3. `committed_unpaid_paise` is appended LAST — CREATE OR REPLACE VIEW permits
 *    new columns only at the end. It is what the project owes vendors and has
 *    not paid, and it is what makes the margin tile honest.
 *
 * Going the OTHER way (down()) cannot use CREATE OR REPLACE VIEW at all:
 * Postgres refuses to drop a trailing column that way ("cannot drop columns
 * from view", confirmed against this database with a throwaway test view)
 * even though it happily accepts one being appended. Reverting therefore DROPs
 * the view and recreates the V1 shape from scratch — see the migration's
 * `down()`, not `CREATE OR REPLACE VIEW v1-body` on top of v2.
 */
export const CREATE_V_PROJECT_BALANCE_V1 = `
  CREATE VIEW v_project_balance AS
  SELECT
    p.id                                              AS project_id,
    cp.customer_id,
    COALESCE(ms.contract_paise, 0)::BIGINT            AS contract_paise,
    COALESCE(ms.expected_paise, 0)::BIGINT            AS expected_paise,
    COALESCE(ms.waived_paise,   0)::BIGINT            AS waived_paise,
    COALESCE(ms.cancelled_paise, 0)::BIGINT           AS cancelled_paise,
    COALESCE(le.received_paise, 0)::BIGINT            AS received_paise,
    COALESCE(le.spent_paise,    0)::BIGINT            AS spent_paise,
    COALESCE(le.refunded_paise, 0)::BIGINT            AS refunded_paise,
    COALESCE(msb.outstanding_paise, 0)::BIGINT        AS outstanding_paise,
    GREATEST(COALESCE(le.received_paise, 0) - COALESCE(al.allocated_paise, 0), 0)::BIGINT
                                                      AS unallocated_paise,
    (COALESCE(le.received_paise, 0) - COALESCE(le.spent_paise, 0)
       - COALESCE(le.refunded_paise, 0))::BIGINT
                                                      AS net_cash_paise,
    COALESCE(le.receipt_count,   0)::int              AS receipt_count,
    COALESCE(ms.milestone_count, 0)::int              AS milestone_count,
    COALESCE(ms.quoted_paise, 0)::BIGINT              AS quoted_paise,
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
           SUM(m.amount_paise) FILTER (WHERE m.status = 'cancelled')::BIGINT AS cancelled_paise,
           COUNT(*)::int                                                AS milestone_count
      FROM payment_milestones m WHERE m.project_id = p.id
  ) ms ON TRUE
  LEFT JOIN LATERAL (
    SELECT SUM(e.amount_paise) FILTER (WHERE e.direction = 'in')::BIGINT  AS received_paise,
           SUM(-e.amount_paise) FILTER (
             WHERE e.direction = 'out' AND e.entry_type <> 'refund'
           )::BIGINT                                                      AS spent_paise,
           SUM(-e.amount_paise) FILTER (
             WHERE e.direction = 'out' AND e.entry_type = 'refund'
           )::BIGINT                                                      AS refunded_paise,
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

export const CREATE_V_PROJECT_BALANCE_V2 = `
  CREATE OR REPLACE VIEW v_project_balance AS
  SELECT
    p.id                                              AS project_id,
    cp.customer_id,
    COALESCE(ms.contract_paise, 0)::BIGINT            AS contract_paise,
    COALESCE(ms.expected_paise, 0)::BIGINT            AS expected_paise,
    -- CHANGE 1: was COALESCE(ms.waived_paise, 0) — SUM(expected) over waived
    -- milestones, which double-counts anything collected before the waiver.
    -- Now sums the UNPAID remainder from v_milestone_balance instead, so the
    -- project cross-foots. ms.waived_paise (below, inside the ms lateral) is
    -- left computing what it always computed; nothing outside this view read
    -- it directly, and only this one outer reference moves.
    COALESCE((SELECT SUM(b.balance_paise) FROM v_milestone_balance b
               WHERE b.project_id = p.id AND b.status = 'waived'), 0)::BIGINT
                                                      AS waived_paise,
    COALESCE(ms.cancelled_paise, 0)::BIGINT           AS cancelled_paise,
    COALESCE(le.received_paise, 0)::BIGINT            AS received_paise,
    COALESCE(le.spent_paise,    0)::BIGINT            AS spent_paise,
    COALESCE(le.refunded_paise, 0)::BIGINT            AS refunded_paise,
    COALESCE(msb.outstanding_paise, 0)::BIGINT        AS outstanding_paise,
    GREATEST(COALESCE(le.received_paise, 0) - COALESCE(al.allocated_paise, 0), 0)::BIGINT
                                                      AS unallocated_paise,
    (COALESCE(le.received_paise, 0) - COALESCE(le.spent_paise, 0)
       - COALESCE(le.refunded_paise, 0))::BIGINT
                                                      AS net_cash_paise,
    COALESCE(le.receipt_count,   0)::int              AS receipt_count,
    COALESCE(ms.milestone_count, 0)::int              AS milestone_count,
    COALESCE(ms.quoted_paise, 0)::BIGINT              AS quoted_paise,
    COALESCE(ms.change_order_paise, 0)::BIGINT        AS change_order_paise,
    -- CHANGE 3: appended last — CREATE OR REPLACE VIEW permits new columns
    -- only at the end. What the project owes vendors and has not paid.
    COALESCE(le.committed_unpaid_paise, 0)::BIGINT    AS committed_unpaid_paise
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
           SUM(m.amount_paise) FILTER (WHERE m.status = 'cancelled')::BIGINT AS cancelled_paise,
           COUNT(*)::int                                                AS milestone_count
      FROM payment_milestones m WHERE m.project_id = p.id
  ) ms ON TRUE
  LEFT JOIN LATERAL (
    SELECT SUM(e.amount_paise) FILTER (WHERE e.direction = 'in')::BIGINT  AS received_paise,
           -- CHANGE 2: gains "AND e.is_cash = true", layered onto the existing
           -- "entry_type <> 'refund'" filter — a bill taken on credit is not
           -- cash gone, but a refund still must not count as spend either.
           SUM(-e.amount_paise) FILTER (
             WHERE e.direction = 'out' AND e.entry_type <> 'refund' AND e.is_cash = true
           )::BIGINT                                                      AS spent_paise,
           SUM(-e.amount_paise) FILTER (
             WHERE e.direction = 'out' AND e.entry_type = 'refund'
           )::BIGINT                                                      AS refunded_paise,
           -- CHANGE 3 (lateral half): what the project owes vendors, unpaid —
           -- the credit mirror of spent_paise's new is_cash filter.
           SUM(-e.amount_paise) FILTER (
             WHERE e.direction = 'out' AND e.is_cash = false
           )::BIGINT                                                      AS committed_unpaid_paise,
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

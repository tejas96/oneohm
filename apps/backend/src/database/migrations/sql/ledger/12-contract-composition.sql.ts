/**
 * Split `contract_paise` into where it came from.
 *
 * A project's contract is the quote plus every change order agreed since. Both
 * screens showed the total and neither showed the composition, so a project
 * quoted at ₹2,58,567.54 with ₹40,000.50 of change orders reported ₹2,58,568 in
 * the project list and ₹2,98,568.04 on its own Money tab — both correct, neither
 * reconcilable without opening the project and adding up milestones by hand.
 *
 * Derived by summing `payment_milestones` on `source`, NOT by joining
 * `quote_versions.final_price`. The two agree today, but a milestone amount can
 * legitimately be corrected after conversion, and when it is, the snapshot sum
 * is what the contract is actually built from. Summing the same rows the total
 * comes from guarantees `quoted + change_orders = contract`, always — it cannot
 * drift the way a join to the quote could.
 *
 * Purely additive: two new columns, every existing column and value unchanged.
 */
export const RECREATE_V_PROJECT_BALANCE_WITH_COMPOSITION = `
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
    COALESCE(ms.milestone_count, 0)::int              AS milestone_count,
    -- Appended, not inserted: CREATE OR REPLACE VIEW may only add columns at
    -- the END of the list. Putting them beside contract_paise where they read
    -- better would force a DROP, and dropping this view breaks every dependent
    -- object for the duration of the migration.
    --
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

/** The composition must always reconstruct the total, on every project. */
export const ASSERT_CONTRACT_COMPOSITION = `
  DO $$
  DECLARE bad INT;
  BEGIN
    SELECT COUNT(*) INTO bad
      FROM v_project_balance
     WHERE contract_paise <> quoted_paise + change_order_paise;
    IF bad > 0 THEN
      RAISE EXCEPTION 'ContractComposition: quoted + change_orders <> contract on % project(s)', bad;
    END IF;
  END $$
`;

export const ADD_CONTRACT_COMPOSITION: string[] = [
  RECREATE_V_PROJECT_BALANCE_WITH_COMPOSITION,
  ASSERT_CONTRACT_COMPOSITION,
];

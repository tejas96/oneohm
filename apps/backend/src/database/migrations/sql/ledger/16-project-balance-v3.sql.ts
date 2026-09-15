/**
 * v_project_balance, third edition. One change from V2, in one column.
 *
 * `committed_unpaid_paise` was the sum of bills taken on credit, full stop.
 * Paying one never reduced it. But the payment is cash out, so it also lands
 * in `spent_paise` — and project cost is `spent_paise + committed_unpaid_paise`.
 * Once a bill was paid, its money sat in both halves and the project was
 * charged for it twice.
 *
 * Proved on the real database inside a rolled-back transaction, on a Rs 1,00,000
 * bill paid in full:
 *
 *   after the bill    spent 0         owed 1,00,000   cost 1,00,000
 *   after paying it   spent 1,00,000  owed 1,00,000   cost 2,00,000   <- wrong
 *
 * It now subtracts vendor payments, so it means what the screen says: bills on
 * credit less what has been paid against them. Cost becomes
 * cash expenses + credit bills, which is the real cost — a payment settles a
 * bill, it is not a second cost. "Owed to vendors" clears once the bill is paid.
 *
 * It can go NEGATIVE: a project that paid a vendor more than it was billed is
 * holding an advance. Cost stays right in that case too — the advance is not a
 * cost until a bill arrives — and the screen says "paid ahead" rather than
 * showing a negative debt.
 *
 * Netting is per project, because every ledger entry belongs to one. A vendor
 * paid on project A for a bill booked on project B shows owed on B and ahead on
 * A; the vendor's own total on Payables is still right. The Pay dialog tells
 * people to record one line per project for exactly this reason.
 */
export const CREATE_V_PROJECT_BALANCE_V3 = `
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
    -- What the project still owes vendors: bills on credit less what has been
    -- paid against them. Negative means vendors hold an advance from us.
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
           -- THE ONLY CHANGE FROM V2: vendor payments are subtracted. They are
           -- already in spent_paise as cash, so counting the bill they settle as
           -- well charged the project twice. Reversals net out automatically:
           -- a reversal keeps its target's entry_type and is_cash and flips sign.
           (
             COALESCE(SUM(-e.amount_paise) FILTER (
               WHERE e.direction = 'out' AND e.is_cash = false
             ), 0)
             - COALESCE(SUM(-e.amount_paise) FILTER (
               WHERE e.entry_type = 'vendor_payment'
             ), 0)
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

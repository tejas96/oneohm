/**
 * M4 — `payments` → `ledger_entries` (money in), `project_expenses` → money out.
 *
 * `deleted_at IS NULL` is mandatory. Three soft-deleted rows carry
 * `status='received'` and would otherwise migrate as ₹15,777 of live cash,
 * inflating the reconciliation totals and breaking the row-count gate.
 * Separately, `uq_payments_org_number_active` is PARTIAL on `deleted_at IS NULL`
 * — so a soft-deleted `payment_number` may legitimately duplicate a live one and
 * would collide on `uq_ledger_entries_entry_no`.
 *
 * Only `received | verified | cleared` post. Those are the statuses that already
 * counted toward `paid_amount` aggregation (`receipt.service.ts` COUNTED_STATUSES),
 * so this preserves the existing definition of "money we have". `pending` never
 * counted — the ledger records money that moved, not money that might. `bounced`
 * and `refunded` never counted either, so they are simply absent rather than
 * posted-and-reversed: posting them would inflate gross receipts in every
 * date-ranged report for cash that was never collected.
 *
 * `entry_no` copies `payment_number` verbatim (`RCP-2026-27-000058`). No
 * renumbering — every receipt already printed or emailed to a customer must keep
 * matching what the system shows.
 *
 * `value_date` comes from `paid_at`, restored by migration 1850800000000, and
 * carries its `paid_at_is_inferred` flag forward so nobody mistakes a date
 * backfilled from `created_at` for a recorded fact.
 *
 * Dropped deliberately, with reasons:
 *   expected_amount  — a plan figure duplicated onto every receipt of a term;
 *                      the whole reason `SUM(expected_amount)` was wrong.
 *   bank_name,
 *   account_number,
 *   ifsc_code        — the customer's OWN bank details, stored for incoming
 *                      money. Not needed to record that they paid, and a DPDP
 *                      liability. `reference` keeps the UTR/cheque number, which
 *                      is the part that actually identifies the transaction.
 *   transaction_id   — dead duplicate of payment_reference, only ever populated
 *                      by the legacy DTO.
 *   status           — no FSM in an append-only ledger.
 *   reconciled_at/by — reconciliation is not modelled in v1.
 */

/** Must pass before M4 — a duplicate would collide on uq_ledger_entries_entry_no. */
export const ASSERT_NO_DUPLICATE_PAYMENT_NUMBERS = `
  DO $$
  DECLARE n INTEGER;
  BEGIN
    SELECT COUNT(*) INTO n FROM (
      SELECT organization_id, payment_number
        FROM payments
       WHERE deleted_at IS NULL
         AND status IN ('received', 'verified', 'cleared')
       GROUP BY organization_id, payment_number
      HAVING COUNT(*) > 1
    ) d;
    IF n > 0 THEN
      RAISE EXCEPTION 'M4: % duplicate (organization_id, payment_number) pairs among live counted payments.', n;
    END IF;
  END $$
`;

/** Must pass before M4 — ledger_entries.created_by is NOT NULL. */
export const ASSERT_NO_NULL_PAYMENT_CREATED_BY = `
  DO $$
  DECLARE n INTEGER;
  BEGIN
    SELECT COUNT(*) INTO n
      FROM payments
     WHERE deleted_at IS NULL
       AND status IN ('received', 'verified', 'cleared')
       AND created_by IS NULL;
    IF n > 0 THEN
      RAISE EXCEPTION 'M4: % counted payments have a NULL created_by, but ledger_entries.created_by is NOT NULL.', n;
    END IF;
  END $$
`;

/** Logs what is being left behind, so the excluded set is never silent. */
export const REPORT_EXCLUDED_PAYMENTS = `
  DO $$
  DECLARE excluded_count INTEGER; excluded_sum NUMERIC;
  BEGIN
    SELECT COUNT(*), COALESCE(SUM(paid_amount), 0)
      INTO excluded_count, excluded_sum
      FROM payments
     WHERE deleted_at IS NOT NULL
        OR status NOT IN ('received', 'verified', 'cleared');
    RAISE NOTICE 'M4: excluding % payment rows totalling % (soft-deleted or non-counted status)',
      excluded_count, excluded_sum;
  END $$
`;

export const BACKFILL_LEDGER_RECEIPTS = `
  INSERT INTO ledger_entries (
    id, organization_id, project_id, customer_id,
    entry_no, entry_type, direction, amount_paise,
    value_date, value_date_is_inferred,
    payment_method, reference, notes,
    source_table, source_id,
    created_at, created_by
  )
  SELECT
    p.id,
    p.organization_id,
    p.project_id,
    p.customer_id,
    p.payment_number,
    'receipt',
    'in',
    ROUND(p.paid_amount * 100)::BIGINT,
    p.paid_at,
    p.paid_at_is_inferred,
    p.payment_method,
    p.payment_reference,
    p.notes,
    'payments',
    p.id,
    p.created_at,
    p.created_by
  FROM payments p
  WHERE p.deleted_at IS NULL
    AND p.status IN ('received', 'verified', 'cleared')
    AND p.paid_amount > 0
`;

/**
 * `project_expenses` is empty in production (0 rows), but the path must exist
 * and be exercised so the code is not written for the first time under pressure.
 * Expenses are money OUT, so `amount_paise` is negative.
 */
export const BACKFILL_LEDGER_EXPENSES = `
  INSERT INTO ledger_entries (
    id, organization_id, project_id,
    entry_no, entry_type, direction, amount_paise,
    value_date, value_date_is_inferred,
    payment_method, counterparty, category, notes,
    source_table, source_id,
    created_at, created_by
  )
  SELECT
    e.id,
    e.organization_id,
    e.project_id,
    e.expense_number,
    'expense',
    'out',
    -ROUND(e.amount * 100)::BIGINT,
    e.expense_date,
    false,
    e.payment_method,
    e.vendor_name,
    e.category,
    e.notes,
    'project_expenses',
    e.id,
    e.created_at,
    e.created_by
  FROM project_expenses e
  WHERE e.deleted_at IS NULL
    AND e.amount > 0
    AND e.created_by IS NOT NULL
`;

export const BACKFILL_ENTRIES: string[] = [
  ASSERT_NO_DUPLICATE_PAYMENT_NUMBERS,
  ASSERT_NO_NULL_PAYMENT_CREATED_BY,
  REPORT_EXCLUDED_PAYMENTS,
  BACKFILL_LEDGER_RECEIPTS,
  BACKFILL_LEDGER_EXPENSES,
];

export const UNDO_BACKFILL_ENTRIES: string[] = [`DELETE FROM ledger_entries`];

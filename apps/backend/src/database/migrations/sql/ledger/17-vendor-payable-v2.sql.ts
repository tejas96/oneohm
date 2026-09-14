/**
 * v_vendor_payable, second edition. Same columns in the same order with the
 * same types; two FILTERs change.
 *
 * `oldest_bill_date` and `bill_count` skipped the rows that ARE reversals but
 * still counted the bill a reversal undid. A vendor whose only bill had been
 * reversed showed "1 bill, oldest 14 Sept" beside nothing owed — and a days-
 * past-terms figure counted from a bill that no longer exists. A reversed bill
 * is not a bill any more, so both columns now leave it out.
 *
 * The join to the reversing row cannot multiply rows: `uq_ledger_entries_reverses`
 * allows at most one reversal per entry. The money columns are untouched — both
 * SUMs were already net of reversals, which carry the opposite sign.
 */
export const CREATE_V_VENDOR_PAYABLE_V2 = `
  CREATE OR REPLACE VIEW v_vendor_payable AS
  SELECT
    vn.id                                                                    AS vendor_id,
    vn.name,
    vn.code,
    vn.credit_days,
    vn.deleted_at,
    COALESCE(SUM(-e.amount_paise) FILTER (WHERE e.is_cash = false), 0)::BIGINT
                                                                             AS billed_paise,
    COALESCE(SUM(-e.amount_paise) FILTER (WHERE e.entry_type = 'vendor_payment'), 0)::BIGINT
                                                                             AS paid_paise,
    (COALESCE(SUM(-e.amount_paise) FILTER (WHERE e.is_cash = false), 0)
     - COALESCE(SUM(-e.amount_paise) FILTER (WHERE e.entry_type = 'vendor_payment'), 0)
    )::BIGINT                                                                AS payable_paise,
    MIN(e.value_date) FILTER (
      WHERE e.is_cash = false AND e.reverses_id IS NULL AND rev.id IS NULL
    )                                                                        AS oldest_bill_date,
    COUNT(*) FILTER (
      WHERE e.is_cash = false AND e.reverses_id IS NULL AND rev.id IS NULL
    )::int                                                                   AS bill_count
  FROM vendors vn
  LEFT JOIN ledger_entries e   ON e.vendor_id = vn.id
  LEFT JOIN ledger_entries rev ON rev.reverses_id = e.id
  GROUP BY vn.id, vn.name, vn.code, vn.credit_days, vn.deleted_at
`;

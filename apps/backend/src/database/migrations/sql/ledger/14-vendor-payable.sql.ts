/**
 * Legacy expense categories, mapped at READ time.
 *
 * The live ledger holds `labour` beside `labor`, plus `Insurance` and `Other`,
 * and 5 rows with no category at all — 77% of all spend. They cannot be
 * rewritten: `trg_ledger_entries_append_only` rejects every UPDATE, and that
 * guarantee is worth more than tidy rows.
 *
 * `uncategorised` is a REPORTING value only. `RecordExpenseDto` still refuses
 * anything outside the seven canonical categories on input.
 */
export const CREATE_LEDGER_NORM_CATEGORY = `
  CREATE OR REPLACE FUNCTION ledger_norm_category(raw TEXT)
  RETURNS TEXT
  LANGUAGE SQL
  IMMUTABLE
  AS $$
    SELECT CASE BTRIM(LOWER(COALESCE(raw, '')))
      WHEN ''          THEN 'uncategorised'
      WHEN 'labour'    THEN 'labor'
      WHEN 'insurance' THEN 'miscellaneous'
      WHEN 'other'     THEN 'miscellaneous'
      ELSE BTRIM(LOWER(raw))
    END
  $$
`;

/**
 * What the company owes each vendor, netted — no bill-by-bill matching.
 *
 * Two vendors and twelve expenses do not justify an allocation table, and a net
 * balance cannot drift out of step with the rows behind it.
 *
 * `payable_paise` may be NEGATIVE. That is a vendor advance — we paid ahead — and
 * it is displayed as "Advance", never clamped to zero. Clamping hides real money.
 *
 * `oldest_bill_date` is the oldest credit bill, NOT the oldest unpaid one. Without
 * bill-by-bill matching those differ once a part payment lands, which is why the
 * column is labelled "Oldest bill" on screen. Do not relabel it.
 *
 * Reversals need no special case: `chk_ledger_entries_direction_sign` forces a
 * reversal to carry the opposite sign, so both SUMs are already net of them.
 */
export const CREATE_V_VENDOR_PAYABLE = `
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
    MIN(e.value_date) FILTER (WHERE e.is_cash = false AND e.reverses_id IS NULL)
                                                                             AS oldest_bill_date,
    COUNT(*) FILTER (WHERE e.is_cash = false AND e.reverses_id IS NULL)::int  AS bill_count
  FROM vendors vn
  LEFT JOIN ledger_entries e ON e.vendor_id = vn.id
  GROUP BY vn.id, vn.name, vn.code, vn.credit_days, vn.deleted_at
`;

export const DROP_V_VENDOR_PAYABLE = `DROP VIEW IF EXISTS v_vendor_payable`;
export const DROP_LEDGER_NORM_CATEGORY = `DROP FUNCTION IF EXISTS ledger_norm_category(TEXT)`;

/**
 * What we owe each vendor.
 *
 * `daysPastTerms` is null when there is no bill or no agreed credit period —
 * "0 days late" against terms nobody set would be an invented fact.
 *
 * A soft-deleted vendor still carrying a balance is INCLUDED, flagged inactive.
 * Money must not disappear because someone tidied a list.
 */
export const PAYABLES_PAGE_SQL = `
  SELECT
    p.vendor_id                                   AS "vendorId",
    p.name                                        AS "vendorName",
    p.code                                        AS "vendorCode",
    p.credit_days                                 AS "creditDays",
    p.payable_paise                               AS "payablePaise",
    p.billed_paise                                AS "billedPaise",
    p.paid_paise                                  AS "paidPaise",
    to_char(p.oldest_bill_date, 'YYYY-MM-DD')     AS "oldestBillDate",
    p.bill_count                                  AS "billCount",
    CASE WHEN p.oldest_bill_date IS NULL OR p.credit_days IS NULL THEN NULL
         ELSE GREATEST(CURRENT_DATE - (p.oldest_bill_date + p.credit_days * INTERVAL '1 day')::date, 0)::int
    END                                           AS "daysPastTerms",
    (p.deleted_at IS NOT NULL)                    AS "isInactive"
  FROM v_vendor_payable p
  WHERE ($1::text IS NULL OR p.name ILIKE '%' || $1 || '%' OR p.code ILIKE '%' || $1 || '%')
    AND ($2::boolean IS NOT TRUE OR p.payable_paise > 0) -- "Owing only" is a work list to pay; advances are not owed
    AND (p.deleted_at IS NULL OR p.payable_paise <> 0)
  ORDER BY p.payable_paise DESC, p.name
  LIMIT $3 OFFSET $4
`;

export const PAYABLES_COUNT_SQL = `
  SELECT COUNT(*)::int AS count
  FROM v_vendor_payable p
  WHERE ($1::text IS NULL OR p.name ILIKE '%' || $1 || '%' OR p.code ILIKE '%' || $1 || '%')
    AND ($2::boolean IS NOT TRUE OR p.payable_paise > 0) -- "Owing only" is a work list to pay; advances are not owed
    AND (p.deleted_at IS NULL OR p.payable_paise <> 0)
`;

/**
 * Headline figures, from the server.
 *
 * Debts and advances are summed SEPARATELY and never netted. Owing one vendor
 * Rs 1,00,000 while holding a Rs 20,000 advance with another is not an Rs 80,000
 * liability — it is a debt and a credit, and they are settled with different people.
 */
export const PAYABLES_TOTALS_SQL = `
  SELECT
    COALESCE(SUM(payable_paise) FILTER (WHERE payable_paise > 0), 0)::BIGINT  AS "totalPayablePaise",
    COUNT(*) FILTER (WHERE payable_paise > 0)::int                            AS "vendorsOwedCount",
    COALESCE(SUM(-payable_paise) FILTER (WHERE payable_paise < 0), 0)::BIGINT AS "advancePaise"
  FROM v_vendor_payable
  WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%' OR code ILIKE '%' || $1 || '%')
`;

/**
 * Every bill on credit and every payment behind one vendor's payable.
 *
 * Answers "which bills make up what we owe Arihant?", which nothing else in the
 * app could. Only rows that move the payable appear: credit bills and vendor
 * payments. An ordinary expense paid on the day and tagged with the vendor
 * never changed what we owe, so it is not here.
 *
 * `balanceAfterPaise` is the vendor's payable once that line is counted, in the
 * order the money moved. It is computed across ALL of the vendor's rows before
 * the newest 100 are cut, so it is right even when older lines are not shown,
 * and the newest line's balance always equals the vendor's payable on
 * `v_vendor_payable`. A bill adds, a payment subtracts, and a reversal carries
 * the opposite sign to its target, so it undoes that line on its own.
 *
 * `amountPaise` is shown positive for a bill or a payment and negative for a
 * reversal. Newest first, because the recent bills are the ones being paid.
 */
export const VENDOR_PAYABLE_ENTRIES_SQL = `
  SELECT "entryId", "entryNo", "valueDate", "kind", "amountPaise", "paymentMethod", reference,
         "projectId", "projectNumber", "isReversal", "isReversed", "balanceAfterPaise"
    FROM (
      SELECT
        e.id                                                   AS "entryId",
        e.entry_no                                             AS "entryNo",
        to_char(e.value_date, 'YYYY-MM-DD')                    AS "valueDate",
        CASE WHEN e.entry_type = 'vendor_payment' THEN 'payment' ELSE 'bill' END
                                                               AS "kind",
        (-e.amount_paise)::BIGINT                              AS "amountPaise",
        e.payment_method                                       AS "paymentMethod",
        e.reference,
        pr.id                                                  AS "projectId",
        pr.project_number                                      AS "projectNumber",
        (e.reverses_id IS NOT NULL)                            AS "isReversal",
        EXISTS (SELECT 1 FROM ledger_entries r WHERE r.reverses_id = e.id)
                                                               AS "isReversed",
        SUM(CASE WHEN e.is_cash = false THEN -e.amount_paise ELSE e.amount_paise END)
          OVER (ORDER BY e.value_date, e.created_at, e.id)::BIGINT
                                                               AS "balanceAfterPaise",
        e.value_date                                           AS sort_date,
        e.created_at                                           AS sort_created,
        e.id                                                   AS sort_id
      FROM ledger_entries e
      JOIN projects pr ON pr.id = e.project_id
      WHERE e.vendor_id = $1
        AND (e.is_cash = false OR e.entry_type = 'vendor_payment')
    ) lines
   ORDER BY sort_date DESC, sort_created DESC, sort_id DESC
   LIMIT 100
`;

export const VENDOR_PAYABLE_ENTRIES_COUNT_SQL = `
  SELECT COUNT(*)::int AS count
    FROM ledger_entries e
   WHERE e.vendor_id = $1
     AND (e.is_cash = false OR e.entry_type = 'vendor_payment')
`;

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

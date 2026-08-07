/**
 * The company. Formerly the single row of the `organizations` table, which was
 * dropped when the app went single-tenant — see
 * docs/plans/2026-08-07-org-cleanup-design.md.
 *
 * This is the only source of company identity. Do not reintroduce a hardcoded
 * company block in a template; import from here.
 */
export const COMPANY = {
  name: 'OneOhm',
  email: 'sanjay@oneohm.com',
  phone: '+919850808484',
  address: 'Plot No.93, Vasantdada Industrial Estate, Sangli',
  city: 'sangli',
  state: 'Maharashtra',
  country: 'India',
  pincode: '416416',

  /**
   * Held for reference only. NOT printed on receipts: a receipt is a payment
   * acknowledgement and says so explicitly, not a tax invoice.
   */
  gstin: '27AABCU9603R1ZM',
  pan: 'AABCU9603R',

  timezone: 'Asia/Kolkata',
  currency: 'INR',
  dateFormat: 'DD-MM-YYYY',

  defaultProjectTimelineWeeks: 4,
  defaultQuoteValidityDays: 30,
  maxQuoteVersions: 3,
} as const;

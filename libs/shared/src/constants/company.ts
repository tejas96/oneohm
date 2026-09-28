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

  /** Printed wherever a filed document names the vendor. */
  legalName: 'Oneohm Sustainable Green Energy Private Limited',

  /**
   * Embedded in every generated human-readable code — `TSK-ONEOHM_EPC-2026-6435`,
   * `CUST-ONEOHM_EPC-2026-0234`, `PROP-…`, `PRJ-…`. The generators find the next
   * number by scanning for this exact prefix, so changing it does not merely
   * restyle new codes: it restarts every sequence from 1 and orphans thousands
   * of existing rows. It is not cosmetic.
   */
  code: 'ONEOHM_EPC',
  email: 'sanjay@oneohm.com',
  phone: '+919850808484',
  address: 'Plot No.93, Vasantdada Industrial Estate, Sangli',
  city: 'sangli',
  state: 'Maharashtra',
  country: 'India',
  pincode: '416416',

  /** Who signs the DISCOM declarations (the DCR) for the company. */
  reportSignatory: {
    name: 'Sneha Sanjay Patil',
    designation: 'Director',
    phone: '8788275659',
    email: 'sneha.oneohm@gmail.com',
  },

  /**
   * The company's own letterhead, printed at the top of letters we send to the
   * DISCOM (the meter test covering letter). Receipts keep the contact above.
   */
  letterhead: {
    tagline: 'MNRE Registered Vendor and Consultant',
    address:
      'Plot No. 93, Vasantdada Industrial Estate, Near Old RTO Office, Sangli, Tal. Miraj, Dist. Sangli, Maharashtra 416416',
    phones: ['8788275659', '8380037272', '9797979598'],
    email: 'oneohmpvtltd@gmail.com',
  },

  cin: 'U35109PN2024PTC234457',

  /**
   * Printed on the letterhead. NOT printed on receipts: a receipt is a payment
   * acknowledgement and says so explicitly, not a tax invoice.
   */
  gstin: '27AAECO5032B1ZW',
  pan: 'AAECO5032B',

  timezone: 'Asia/Kolkata',
  currency: 'INR',
  dateFormat: 'DD-MM-YYYY',

  defaultProjectTimelineWeeks: 4,
  defaultQuoteValidityDays: 30,
  maxQuoteVersions: 3,
} as const;

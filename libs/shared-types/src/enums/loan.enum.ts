/**
 * ============================================
 * LOAN & FINANCE ENUMS
 * ============================================
 * Schema Reference: Lines 1783-1867
 */

/**
 * Loan Application Status
 */
export enum LoanStatus {
  INITIATED = 'initiated',
  DOCUMENTS_PENDING = 'documents_pending',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  SITE_VISIT_PENDING = 'site_visit_pending',
  APPROVED = 'approved',
  DISBURSED = 'disbursed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

/**
 * Loan Document Types
 */
export enum LoanDocumentType {
  // Identity Documents
  AADHAAR_CARD = 'aadhaar_card',
  PAN_CARD = 'pan_card',
  VOTER_ID = 'voter_id',
  PASSPORT = 'passport',

  // Address Proof
  ELECTRICITY_BILL = 'electricity_bill',
  RATION_CARD = 'ration_card',
  BANK_STATEMENT = 'bank_statement',

  // Income Documents
  SALARY_SLIP = 'salary_slip',
  ITR = 'itr',
  FORM_16 = 'form_16',
  BANK_STATEMENT_6_MONTHS = 'bank_statement_6_months',

  // Property Documents
  PROPERTY_PAPERS = 'property_papers',
  NOC = 'noc',

  // Project Documents
  QUOTE = 'quote',
  TECHNICAL_PROPOSAL = 'technical_proposal',
  SITE_PHOTOS = 'site_photos',

  // Other
  OTHER = 'other',
}


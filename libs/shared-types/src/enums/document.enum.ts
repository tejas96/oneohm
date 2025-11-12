/**
 * ============================================
 * DOCUMENT TYPE ENUM
 * ============================================
 * Defines types of documents in the system
 */
export enum DocumentType {
  // Contracts & Agreements
  CONTRACT = 'contract',
  AGREEMENT = 'agreement',
  NDA = 'nda',

  // Quotations & Proposals
  QUOTE = 'quote',
  PROPOSAL = 'proposal',

  // Invoices & Financial
  INVOICE = 'invoice',
  PAYMENT_RECEIPT = 'payment_receipt',

  // Work Completion Reports (WCR)
  WCR = 'wcr',
  WCR_PRELIMINARY = 'wcr_preliminary',
  WCR_FINAL = 'wcr_final',

  // Technical Documents
  SITE_SURVEY = 'site_survey',
  TECHNICAL_DRAWING = 'technical_drawing',
  INSTALLATION_MANUAL = 'installation_manual',

  // Compliance & Approvals
  COMPLIANCE_CERTIFICATE = 'compliance_certificate',
  APPROVAL_LETTER = 'approval_letter',
  INSPECTION_REPORT = 'inspection_report',

  // Customer Documents
  IDENTITY_PROOF = 'identity_proof',
  ADDRESS_PROOF = 'address_proof',
  ELECTRICITY_BILL = 'electricity_bill',

  // Loan Documents
  LOAN_APPLICATION = 'loan_application',
  LOAN_SANCTION = 'loan_sanction',
  LOAN_AGREEMENT = 'loan_agreement',

  // Subsidy Documents
  SUBSIDY_APPLICATION = 'subsidy_application',
  SUBSIDY_APPROVAL = 'subsidy_approval',

  // Maintenance & Service
  MAINTENANCE_REPORT = 'maintenance_report',
  SERVICE_REPORT = 'service_report',
  WARRANTY_CERTIFICATE = 'warranty_certificate',

  // General
  OTHER = 'other',
}

/**
 * ============================================
 * DOCUMENT STATUS ENUM
 * ============================================
 * Defines document lifecycle statuses
 */
export enum DocumentStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUBMITTED = 'submitted',
  ARCHIVED = 'archived',
}

/**
 * ============================================
 * WCR TYPE ENUM
 * ============================================
 * Work Completion Report specific types
 */
export enum WcrType {
  PRELIMINARY = 'preliminary',
  FINAL = 'final',
}

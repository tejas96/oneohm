import {
  DocumentCategory,
  DocumentEntityType,
  DocumentTag,
  ExpenseCategory,
  ExpensePaidByType,
  LoanDocumentType,
  LoanStatus,
  PaymentTermSource,
  PaymentTermStatus,
  ProjectType,
  DcrPreference,
  ReimbursementStatus,
} from '../types/enums';

export const LOAN_DOCUMENT_TYPE_LABELS: Record<LoanDocumentType, string> = {
  [LoanDocumentType.AADHAAR_CARD]: 'Aadhaar Card',
  [LoanDocumentType.PAN_CARD]: 'PAN Card',
  [LoanDocumentType.ELECTRICITY_BILL]: 'Electricity Bill',
  [LoanDocumentType.RATION_CARD]: 'Ration Card',
  [LoanDocumentType.BANK_STATEMENT]: 'Bank Statement',
  [LoanDocumentType.SALARY_SLIP]: 'Salary Slip',
  [LoanDocumentType.ITR]: 'ITR',
  [LoanDocumentType.FORM_16]: 'Form 16',
  [LoanDocumentType.BANK_STATEMENT_6_MONTHS]: 'Bank Statement (6 Months)',
  [LoanDocumentType.PROPERTY_PAPERS]: 'Property Papers',
  [LoanDocumentType.NOC]: 'NOC',
  [LoanDocumentType.VOTER_ID]: 'Voter ID',
  [LoanDocumentType.PASSPORT]: 'Passport',
  [LoanDocumentType.QUOTE]: 'Quote',
  [LoanDocumentType.TECHNICAL_PROPOSAL]: 'Technical Proposal',
  [LoanDocumentType.SITE_PHOTOS]: 'Site Photos',
  [LoanDocumentType.OTHER]: 'Other',
};

export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  [LoanStatus.INITIATED]: 'Interested',
  [LoanStatus.APPLIED]: 'Applied to Bank',
  [LoanStatus.APPROVED]: 'Approved',
  [LoanStatus.REJECTED]: 'Rejected',
  [LoanStatus.CANCELLED]: 'Cancelled',
};

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  [ProjectType.RESIDENTIAL]: 'Residential',
  [ProjectType.RESIDENTIAL_APARTMENT]: 'Residential Apartment',
  [ProjectType.COMMERCIAL]: 'Commercial',
  [ProjectType.INDUSTRIAL]: 'Industrial',
  [ProjectType.AGRICULTURAL]: 'Agricultural',
  [ProjectType.INSTITUTIONAL]: 'Institutional',
};

export const PHASE_TYPE_LABELS: Record<string, string> = {
  single_phase: 'Single Phase',
  three_phase: 'Three Phase',
};

export const DCR_PREFERENCE_LABELS: Record<DcrPreference, { label: string; description: string }> =
  {
    [DcrPreference.AUTO_SPLIT]: {
      label: 'Auto Split',
      description: 'DCR for subsidy portion + Non-DCR for rest (Recommended)',
    },
    [DcrPreference.DCR_ONLY]: {
      label: 'All DCR',
      description: '100% DCR panels - Full subsidy eligible',
    },
    [DcrPreference.NON_DCR_ONLY]: {
      label: 'Non-DCR Only',
      description: 'Budget option - No subsidy',
    },
  };

export const DOCUMENT_TAG_LABELS: Record<DocumentTag, string> = {
  [DocumentTag.ELECTRICITY_BILL]: 'Electricity Bill',
  [DocumentTag.AADHAR_CARD]: 'Aadhaar Card',
  [DocumentTag.PAN_CARD]: 'PAN Card',
  [DocumentTag.SITE_IMAGE]: 'Site Image',
  [DocumentTag.FRONT_VIEW]: 'Front View',
  [DocumentTag.ROOF_VIEW]: 'Roof View',
  [DocumentTag.METER_BOX]: 'Meter Box',
  [DocumentTag.WCR]: 'Work Completion Report',
  [DocumentTag.ANNEXURE_PROFORMA_A]: 'Annexure-I & Proforma-A',
  [DocumentTag.NET_METERING_AGREEMENT]: 'Net Metering Connection Agreement',
  [DocumentTag.DCR]: 'DCR Undertaking / Self-Declaration',
  [DocumentTag.MODEL_AGREEMENT]: 'Model Agreement',
  [DocumentTag.REPORT]: 'Report',
  [DocumentTag.CONTRACT]: 'Contract',
  [DocumentTag.INVOICE]: 'Invoice',
  [DocumentTag.RECEIPT_PROOF]: 'Receipt Proof',
  [DocumentTag.RECEIPT_PDF]: 'Receipt PDF',
  [DocumentTag.EXPENSE_VOUCHER]: 'Expense Voucher',
  [DocumentTag.EXPENSE_RECEIPT]: 'Expense Receipt',
  [DocumentTag.OTHER]: 'Other',
};

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  [DocumentCategory.DOCUMENT]: 'Document',
  [DocumentCategory.IMAGE]: 'Image',
  [DocumentCategory.REPORT]: 'Report',
};

// ============================================
// DOCUMENT ENTITY TYPE LABELS
// ============================================

export const DOCUMENT_ENTITY_TYPE_LABELS: Record<DocumentEntityType, string> = {
  [DocumentEntityType.CUSTOMER]: 'Customer Documents',
  [DocumentEntityType.PROPERTY]: 'Property Documents',
  [DocumentEntityType.SITE_ACTIVITY]: 'Site Activity Documents',
  [DocumentEntityType.LOAN]: 'Loan Documents',
  [DocumentEntityType.QUOTE]: 'Quote Documents',
  [DocumentEntityType.PROJECT]: 'Project Documents',
  [DocumentEntityType.PAYMENT]: 'Payment Documents',
  [DocumentEntityType.PROJECT_EXPENSE]: 'Expense Documents',
};

/** Ordered options for entity type selectors — used by upload dialogs and filters */
export const DOCUMENT_ENTITY_TYPE_OPTIONS: ReadonlyArray<{
  value: DocumentEntityType;
  label: string;
}> = [
  { value: DocumentEntityType.CUSTOMER, label: 'Customer' },
  { value: DocumentEntityType.PROPERTY, label: 'Property' },
  { value: DocumentEntityType.SITE_ACTIVITY, label: 'Site Activity' },
  { value: DocumentEntityType.LOAN, label: 'Loan' },
  { value: DocumentEntityType.QUOTE, label: 'Quote' },
  { value: DocumentEntityType.PROJECT, label: 'Project' },
  { value: DocumentEntityType.PAYMENT, label: 'Payment' },
  { value: DocumentEntityType.PROJECT_EXPENSE, label: 'Project Expense' },
];

/** Fixed display ordering for grouping documents by entity type */
export const DOCUMENT_ENTITY_TYPE_ORDER: readonly DocumentEntityType[] = [
  DocumentEntityType.CUSTOMER,
  DocumentEntityType.PROPERTY,
  DocumentEntityType.SITE_ACTIVITY,
  DocumentEntityType.LOAN,
  DocumentEntityType.QUOTE,
  DocumentEntityType.PROJECT,
  DocumentEntityType.PAYMENT,
  DocumentEntityType.PROJECT_EXPENSE,
];

export { PANEL_TECHNOLOGY_LABELS } from '../types/enums/product.enum';

// ============================================
// FINANCE LABELS
// ============================================

export const PAYMENT_TERM_STATUS_LABELS: Record<PaymentTermStatus, string> = {
  [PaymentTermStatus.PENDING]: 'Pending',
  [PaymentTermStatus.PARTIAL]: 'Partial',
  [PaymentTermStatus.PAID]: 'Paid',
  [PaymentTermStatus.WAIVED]: 'Waived',
  [PaymentTermStatus.CANCELLED]: 'Cancelled',
};

export const PAYMENT_TERM_SOURCE_LABELS: Record<PaymentTermSource, string> = {
  [PaymentTermSource.QUOTE_SNAPSHOT]: 'From quote',
  [PaymentTermSource.MANUAL]: 'Manual',
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.MATERIALS]: 'Materials',
  [ExpenseCategory.LABOR]: 'Labor',
  [ExpenseCategory.TRAVEL]: 'Travel',
  [ExpenseCategory.EQUIPMENT]: 'Equipment',
  [ExpenseCategory.SUBCONTRACTOR]: 'Subcontractor',
  [ExpenseCategory.PERMITS]: 'Permits',
  [ExpenseCategory.MISC]: 'Miscellaneous',
};

export const EXPENSE_PAID_BY_LABELS: Record<ExpensePaidByType, string> = {
  [ExpensePaidByType.COMPANY]: 'Company',
  [ExpensePaidByType.EMPLOYEE]: 'Employee',
};

export const REIMBURSEMENT_STATUS_LABELS: Record<ReimbursementStatus, string> = {
  [ReimbursementStatus.NOT_APPLICABLE]: 'N/A',
  [ReimbursementStatus.PENDING]: 'Pending',
  [ReimbursementStatus.REIMBURSED]: 'Reimbursed',
};

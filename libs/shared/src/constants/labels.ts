import {
  DocumentCategory,
  DocumentTag,
  LoanDocumentType,
  LoanStatus,
  ProjectType,
  DcrPreference,
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

export { PANEL_TECHNOLOGY_LABELS } from '../types/enums/product.enum';

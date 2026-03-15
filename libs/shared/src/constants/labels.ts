import {
  LoanDocumentType,
  LoanStatus,
  ProjectType,
  PhaseType,
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

export const PHASE_TYPE_LABELS: Record<PhaseType, string> = {
  [PhaseType.SINGLE_PHASE]: 'Single Phase',
  [PhaseType.THREE_PHASE]: 'Three Phase',
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

export { PANEL_TECHNOLOGY_LABELS } from '../types/enums/product.enum';

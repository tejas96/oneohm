/**
 * Document Collector Constants
 *
 * Configurable document slots for loan/KYC document collection.
 * Matches mobile app constants.
 *
 * @module shared/document-collector/constants
 */

import { LoanDocumentType, type DocumentSlot } from './types';

// ============================================================================
// Document Slots Configuration
// ============================================================================

/**
 * Default loan/KYC document slots
 * Aadhaar is required when loan is wanted, others are optional
 */
export const LOAN_DOCUMENT_SLOTS: DocumentSlot[] = [
  {
    id: LoanDocumentType.AADHAAR_CARD,
    label: 'Aadhaar Card',
    required: true, // Required for loan
    description: 'Front side of Aadhaar card',
    icon: 'id-card',
  },
  {
    id: LoanDocumentType.PAN_CARD,
    label: 'PAN Card',
    required: false,
    description: 'PAN card for tax verification',
    icon: 'credit-card',
  },
  {
    id: LoanDocumentType.ELECTRICITY_BILL,
    label: 'Electricity Bill',
    required: false,
    description: 'Recent electricity bill',
    icon: 'zap',
  },
  {
    id: LoanDocumentType.BANK_STATEMENT,
    label: 'Bank Statement',
    required: false,
    description: '3-6 months bank statement',
    icon: 'landmark',
  },
];

/**
 * Get slots with dynamic required status based on wantsLoan
 */
export function getDocumentSlots(wantsLoan: boolean): DocumentSlot[] {
  return LOAN_DOCUMENT_SLOTS.map((slot) => ({
    ...slot,
    // Only Aadhaar is required, and only when loan is wanted
    required: wantsLoan && slot.id === (LoanDocumentType.AADHAAR_CARD as string),
  }));
}

/**
 * Accepted file types for document upload
 */
export const ACCEPTED_FILE_TYPES = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  pdf: ['application/pdf'],
  all: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'],
};

/**
 * Maximum file size (5MB)
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * File size display helper
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

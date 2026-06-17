/**
 * Document Collector Types
 *
 * Types for document collection and upload functionality.
 *
 * @module shared/document-collector/types
 */

import { LoanDocumentType, type PropertyDocument } from '@tejas96/shared/types';

export { LoanDocumentType };

// ============================================================================
// Document Slot
// ============================================================================

export interface DocumentSlot {
  /** Unique identifier (matches LoanDocumentType or custom) */
  id: string;
  /** Display label */
  label: string;
  /** Whether slot is required */
  required: boolean;
  /** Icon name (optional) */
  icon?: string;
  /** Helper description */
  description?: string;
}

// ============================================================================
// Captured Document
// ============================================================================

export interface CapturedDocument {
  /** Unique ID for this document */
  id: string;
  /** File object (undefined for pre-existing docs loaded from backend) */
  file?: File;
  /** Slot ID this document belongs to */
  slotId: string;
  /** Original filename */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** MIME type */
  mimeType: string;
  /** Local preview URL (blob URL, undefined for pre-existing docs) */
  previewUrl?: string;
  /** Upload status */
  status: 'pending' | 'uploading' | 'success' | 'error';
  /** Upload progress (0-100) */
  progress: number;
  /** Cloud storage URL after upload */
  uploadedUrl?: string;
  /** File key in storage */
  fileKey?: string;
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// Conversion Helpers
// ============================================================================

/**
 * Convert multiple captured documents to PropertyDocument array
 */
export function toPropertyDocuments(
  docs: CapturedDocument[],
  wantsLoan: boolean,
): PropertyDocument[] {
  // Filter only successfully uploaded documents
  const uploadedDocs = docs.filter((d) => d.status === 'success' && d.uploadedUrl);

  // Loan document types (all standard loan/KYC documents)
  const loanDocTypes = [
    LoanDocumentType.AADHAAR_CARD,
    LoanDocumentType.PAN_CARD,
    LoanDocumentType.ELECTRICITY_BILL,
    LoanDocumentType.BANK_STATEMENT,
  ];

  return uploadedDocs.map((doc) => ({
    url: doc.uploadedUrl!,
    tag: doc.slotId,
    fileName: doc.fileName,
    fileSize: doc.fileSize,
    isLoanDoc: wantsLoan && loanDocTypes.includes(doc.slotId as LoanDocumentType),
    isVerified: false,
  }));
}

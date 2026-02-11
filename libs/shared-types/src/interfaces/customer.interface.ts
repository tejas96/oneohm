/**
 * Customer & Property Interfaces
 * Shared across backend, web portal, and mobile app
 *
 * @module shared-types/interfaces/customer
 */

// ============================================================================
// Property Document Interfaces
// ============================================================================

/**
 * Property Document - Unified document storage for property-level documents
 * All documents (loan and non-loan) are stored in this format.
 *
 * Storage: JSONB column in customer_properties table
 *
 * @example
 * const doc: PropertyDocument = {
 *   url: "https://storage.example.com/docs/aadhaar.jpg",
 *   tag: "aadhaar_card",
 *   fileName: "aadhaar.jpg",
 *   isLoanDoc: true,
 *   isVerified: false
 * };
 */
export interface PropertyDocument {
  /** Cloud storage URL of the document */
  url: string;
  /** Document type/category tag (e.g., 'aadhaar_card', 'pan_card', 'other') */
  tag: string;
  /** Original filename */
  fileName: string;
  /** Whether this document is used for loan application (aadhaar, pan, electricity_bill) */
  isLoanDoc: boolean;
  /** Verification status */
  isVerified: boolean;
  /** ISO timestamp when document was verified */
  verifiedAt?: string;
  /** User UUID who verified the document */
  verifiedBy?: string;
}

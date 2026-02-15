/**
 * Customer & Property Interfaces
 * Shared across backend, web portal, and mobile app
 *
 * @module shared-types/interfaces/customer
 */

import { FollowupPriority, FollowupStatus, FollowupType } from '../enums/customer.enum';

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

// ============================================================================
// Property Followup Interfaces
// ============================================================================

/**
 * Property Followup - Scheduled activity for a property
 * Stored as JSONB array in customer_properties table
 *
 * @example
 * const followup: PropertyFollowup = {
 *   id: "uuid-here",
 *   type: FollowupType.VISIT,
 *   subject: "Site measurement visit",
 *   scheduledAt: "2026-02-15T10:00:00.000Z",
 *   assignedToUserId: "user-uuid",
 *   status: FollowupStatus.PENDING,
 *   priority: FollowupPriority.NORMAL,
 *   lastUpdatedAt: "2026-02-13T09:00:00.000Z"
 * };
 */
export interface PropertyFollowup {
  /** UUID for this followup (generated with crypto.randomUUID()) */
  id: string;
  /** Type of followup activity */
  type: FollowupType;
  /** Brief description of the followup */
  subject: string;
  /** ISO datetime when this is scheduled */
  scheduledAt: string;
  /** User ID responsible for this followup */
  assignedToUserId: string;
  /** Current status */
  status: FollowupStatus;
  /** Priority level */
  priority: FollowupPriority;
  /** Optional notes */
  notes?: string;
  /** ISO datetime of last create/update (also serves as completion timestamp when status = completed) */
  lastUpdatedAt: string;
}

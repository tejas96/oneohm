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
// Followup Interfaces
// ============================================================================

/**
 * Followup - Scheduled activity for a customer or property
 * Stored in dedicated `followups` table with proper relational structure
 *
 * Supports:
 * - Customer-level followups (propertyId is undefined/null)
 * - Property-level followups (propertyId is set)
 *
 * @example
 * const followup: Followup = {
 *   id: "uuid-here",
 *   organizationId: "org-uuid",
 *   customerId: "customer-uuid",
 *   propertyId: "property-uuid", // optional
 *   type: FollowupType.VISIT,
 *   subject: "Site measurement visit",
 *   scheduledAt: "2026-02-15T10:00:00.000Z",
 *   assignedToUserId: "user-uuid",
 *   status: FollowupStatus.PENDING,
 *   priority: FollowupPriority.NORMAL,
 *   createdAt: "2026-02-13T09:00:00.000Z",
 *   updatedAt: "2026-02-13T09:00:00.000Z"
 * };
 */
export interface Followup {
  /** UUID for this followup */
  id: string;
  /** Organization ID (multi-tenant) */
  organizationId: string;
  /** Customer ID (always required) */
  customerId: string;
  /** Property ID (optional - null for customer-level followups) */
  propertyId?: string;
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
  /** ISO datetime when created */
  createdAt: string;
  /** ISO datetime when last updated */
  updatedAt: string;
  /** User ID who created this followup */
  createdBy?: string;
  /** User ID who last updated this followup */
  updatedBy?: string;
}

/**
 * @deprecated Use Followup instead. PropertyFollowup is kept for backward compatibility.
 */
export type PropertyFollowup = Followup;

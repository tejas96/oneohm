/**
 * Customer & Property Interfaces
 * Shared across backend, web portal, and mobile app
 *
 * @module shared/types/interfaces/customer
 */

import type { Project } from './project.interface';
import type { Quote } from './quote.interface';
import {
  FollowupPriority,
  FollowupStatus,
  FollowupType,
  LeadTemperature,
  PropertyStatus,
  PropertyType,
} from '../enums/customer.enum';
import { QuoteStatus } from '../enums/quote.enum';

// ============================================================================
// Customer Property Interface
// ============================================================================

/**
 * Customer Property - Installation site belonging to a customer
 * Used across backend, web portal, and mobile app for property data
 *
 * @example
 * const property: CustomerProperty = {
 *   id: "uuid-here",
 *   customerId: "customer-uuid",
 *   propertyName: "Main Residence",
 *   propertyType: PropertyType.RESIDENTIAL,
 *   address: "123 MG Road",
 *   city: "Bangalore",
 *   leadTemperature: LeadTemperature.HOT,
 *   wantsLoan: true,
 *   isPrimary: true,
 *   status: PropertyStatus.ACTIVE,
 *   createdAt: "2026-01-15T10:00:00.000Z",
 *   updatedAt: "2026-01-15T10:00:00.000Z"
 * };
 */
export interface CustomerProperty {
  /** UUID for this property */
  id: string;
  /** Customer ID this property belongs to */
  customerId: string;
  /** Optional display name for the property */
  propertyName?: string;
  /** Type of property (residential, commercial, etc.) */
  propertyType: PropertyType;
  /** Street address */
  address?: string;
  /** City name */
  city?: string;
  /** State name */
  state?: string;
  /** Postal code */
  pincode?: string;
  /** Name on electricity bill */
  consumerName?: string;
  /** Lead temperature indicating conversion likelihood */
  leadTemperature: LeadTemperature;
  /** Current electricity load (e.g. "5 KW") */
  currentLoad?: string;
  /** Whether customer wants loan financing for this property */
  wantsLoan: boolean;
  /** Whether this is the primary property for the customer */
  isPrimary: boolean;
  /** Property status */
  status: PropertyStatus;
  /** Latest quote number for this property (enriched from quotes table) */
  latestQuoteNumber?: string;
  /** Status of the latest quote */
  latestQuoteStatus?: QuoteStatus;
  /** Date of the latest quote (ISO string) */
  latestQuoteDate?: string;
  /** ISO datetime when created */
  createdAt: string;
  /** ISO datetime when last updated */
  updatedAt: string;
  /** User ID who created this property */
  createdBy?: string;
  /** User ID who last updated this property */
  updatedBy?: string;
  /** Eagerly joined project details if any */
  project?: Project;
  /** Eagerly joined quotes list if any */
  quotes?: Quote[];
}

// ============================================================================
// Property Document Interfaces
// ============================================================================

/**
 * @deprecated PropertyDocument is deprecated. Documents are now stored in the `documents` table
 * using the generic entityType+entityId pattern. Use the documents API instead.
 * Kept temporarily for backward compatibility during migration.
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
  /** File size in bytes */
  fileSize?: number;
  /** ISO timestamp when document was uploaded */
  uploadedAt?: string;
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

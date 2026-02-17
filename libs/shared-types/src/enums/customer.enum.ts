/**
 * Customer Status Enum
 * Represents the lifecycle stages of a customer
 */
export enum CustomerStatus {
  LEAD = 'lead', // Initial contact/inquiry
  PROSPECT = 'prospect', // Qualified lead with potential
  ACTIVE = 'active', // Active customer with projects
  INACTIVE = 'inactive', // No longer active
}

/**
 * Property Type Enum
 * Represents different types of installation sites
 */
export enum PropertyType {
  RESIDENTIAL = 'residential',
  RESIDENTIAL_APARTMENT = 'residential_apartment',
  COMMERCIAL = 'commercial',
  INDUSTRIAL = 'industrial',
  AGRICULTURAL = 'agricultural',
  INSTITUTIONAL = 'institutional',
}

/**
 * Property Status Enum
 * Represents the status of a customer property/opportunity
 */
export enum PropertyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_VERIFICATION = 'pending_verification',
}

/**
 * Lead Temperature Enum
 * Indicates conversion likelihood and follow-up priority
 * - HOT: High interest, follow-up in 3 days
 * - WARM: Moderate interest, follow-up in 10 days
 * - COLD: Low interest, follow-up in 15 days
 */
export enum LeadTemperature {
  HOT = 'hot',
  WARM = 'warm',
  COLD = 'cold',
}

/**
 * Connection Type Enum
 * Electricity connection phase type
 */
export enum ConnectionType {
  SINGLE_PHASE = 'single_phase',
  THREE_PHASE = 'three_phase',
}

/**
 * Lead Source Enum
 * Note: Initially using flexible VARCHAR in DB, but defining common sources here
 * May be expanded to separate table if needed in future
 */
export enum LeadSource {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  RESELLER = 'reseller',
  WALK_IN = 'walk_in',
  SOCIAL_MEDIA = 'social_media',
  ADVERTISEMENT = 'advertisement',
  EXHIBITION = 'exhibition',
  COLD_CALL = 'cold_call',
  OTHER = 'other',
}

/**
 * Followup Type Enum
 * Types of scheduled follow-up activities
 */
export enum FollowupType {
  VISIT = 'visit',
  MEETING = 'meeting',
  TASK = 'task',
  REMINDER = 'reminder',
  DOCUMENT_COLLECTION = 'document_collection',
}

/**
 * Followup Status Enum
 * Simple 3-state lifecycle
 */
export enum FollowupStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Followup Priority Enum
 */
export enum FollowupPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
}

/**
 * Customer Sort Field Enum
 * Allowed sort fields for customer list API
 * Values must match entity property names (camelCase)
 */
export enum CustomerSortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  FIRST_NAME = 'firstName',
  CITY = 'city',
  STATUS = 'status',
}

/**
 * Property Sort Field Enum
 * Allowed sort fields for property list API
 * Values must match entity property names (camelCase)
 */
export enum PropertySortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  PROPERTY_NAME = 'propertyName',
  CITY = 'city',
  LEAD_TEMPERATURE = 'leadTemperature',
  PROPERTY_TYPE = 'propertyType',
  STATUS = 'status',
}

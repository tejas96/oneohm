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
 * Note: Initially using flexible VARCHAR in DB, but defining common types here
 * May be expanded to separate table if needed in future
 */
export enum PropertyType {
  RESIDENTIAL = 'residential',
  COMMERCIAL = 'commercial',
  INDUSTRIAL = 'industrial',
  AGRICULTURAL = 'agricultural',
  INSTITUTIONAL = 'institutional',
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

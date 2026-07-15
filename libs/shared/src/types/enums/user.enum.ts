/**
 * User Status Enum
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  ARCHIVED = 'archived',
  BLOCKED = 'blocked',
}

/**
 * User Gender Enum
 */
export enum UserGender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

/**
 * User Profile Type Enum
 * Represents the types of profiles a user can have
 */
export enum UserProfileType {
  CUSTOMER = 'customer',
  RESELLER = 'reseller',
  EMPLOYEE = 'employee',
}

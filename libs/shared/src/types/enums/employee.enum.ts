/**
 * Employee Profile Kind Enum
 * Distinguishes the sub-type of an `employee_profiles` row.
 * Separate from `UserProfileType` (which answers "which table/repo does this
 * profile live in" at the profile.service.ts dispatch layer) — this enum
 * answers "what sub-type of employee_profiles row is this".
 */
export enum EmployeeProfileKind {
  STAFF = 'staff',
  RESELLER = 'reseller',
}

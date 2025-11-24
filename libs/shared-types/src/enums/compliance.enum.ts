/**
 * Compliance Status Enum
 * Represents the lifecycle states of a compliance application
 */
export enum ComplianceStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ON_HOLD = 'on_hold',
}

/**
 * Inspection Status Enum
 * Represents the lifecycle states of an inspection
 */
export enum InspectionStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  PASSED = 'passed',
  FAILED = 'failed',
  RESCHEDULED = 'rescheduled',
  CANCELLED = 'cancelled',
}

/**
 * Subsidy Status Enum
 * Represents the lifecycle states of a subsidy application
 */
export enum SubsidyStatus {
  INITIATED = 'initiated',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  DISBURSED = 'disbursed',
  REJECTED = 'rejected',
}

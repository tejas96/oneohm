/**
 * Site Visit Status
 * Represents the current state of a field worker's site visit
 */
export enum SiteVisitStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

/**
 * Visit Type
 * Types of site visits
 */
export enum VisitType {
  INSPECTION = 'inspection',
  MEASUREMENT = 'measurement',
  INSTALLATION = 'installation',
  MAINTENANCE = 'maintenance',
  FOLLOWUP = 'followup',
}

/**
 * Visit Priority
 * Priority levels for site visits
 */
export enum VisitPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
}

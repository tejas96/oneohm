/**
 * Site Activity Status
 * Represents the overall state of a site activity (visit + survey phases).
 * Option B: single row per property, no type field.
 */
export enum SiteActivityStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Visit Priority
 * Priority levels for site activities
 */
export enum VisitPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
}

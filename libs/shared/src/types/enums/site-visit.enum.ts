/**
 * @deprecated Use imports from './site-activity.enum' instead.
 * This file is kept for backward compatibility during migration.
 */
export { SiteActivityStatus as SiteVisitStatus, VisitPriority } from './site-activity.enum';

/**
 * @deprecated VisitType is no longer used. Remove references.
 */
export enum VisitType {
  INSPECTION = 'inspection',
  MEASUREMENT = 'measurement',
  INSTALLATION = 'installation',
  MAINTENANCE = 'maintenance',
  FOLLOWUP = 'followup',
}

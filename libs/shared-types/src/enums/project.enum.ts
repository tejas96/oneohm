/**
 * Project Status
 * Represents the current state of a project
 */
export enum ProjectStatus {
  DRAFT = 'draft',
  PLANNING = 'planning',
  APPROVED = 'approved',
  IN_PROGRESS = 'in_progress',
  TESTING = 'testing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold',
}

/**
 * Project Priority
 * Indicates the urgency/importance of a project
 */
export enum ProjectPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}
/**
 * Milestone Type
 * Defines the phase/stage of project execution
 */
export enum MilestoneType {
  SITE_SURVEY = 'site_survey',
  DESIGN = 'design',
  APPROVAL = 'approval',
  MATERIAL_PROCUREMENT = 'material_procurement',
  INSTALLATION = 'installation',
  TESTING = 'testing',
  COMMISSIONING = 'commissioning',
  HANDOVER = 'handover',
}

/**
 * Milestone Status
 * Tracks the completion state of a milestone
 */
export enum MilestoneStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  BLOCKED = 'blocked',
}

/**
 * Site Survey Status
 * Tracks the state of site survey activities
 */
export enum SiteSurveyStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Roof Condition
 * Assessment of roof structural condition
 */
export enum RoofCondition {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

/**
 * Roof Orientation
 * Compass direction the roof faces
 */
export enum RoofOrientation {
  NORTH = 'north',
  SOUTH = 'south',
  EAST = 'east',
  WEST = 'west',
  NORTHEAST = 'northeast',
  NORTHWEST = 'northwest',
  SOUTHEAST = 'southeast',
  SOUTHWEST = 'southwest',
}

/**
 * Material Status
 * Tracks the procurement and allocation state of project materials
 */
export enum MaterialStatus {
  REQUIRED = 'required',
  ORDERED = 'ordered',
  IN_TRANSIT = 'in_transit',
  ALLOCATED = 'allocated',
  USED = 'used',
}

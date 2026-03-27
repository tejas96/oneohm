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
  PLANNING = 'planning',
  APPROVAL = 'approval',
  PERMITS = 'permits',
  MATERIAL_PROCUREMENT = 'material_procurement',
  ELECTRICAL = 'electrical',
  INSTALLATION = 'installation',
  INSPECTION = 'inspection',
  TESTING = 'testing',
  COMMISSIONING = 'commissioning',
  MONITORING = 'monitoring',
  HANDOVER = 'handover',
  CUSTOM = 'custom',
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
 * @deprecated SiteSurveyStatus has been replaced by SiteActivityStatus from site-activity.enum.ts
 * Kept temporarily for backward compatibility during migration.
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

/**
 * Task Status
 * Represents the current state of a project task (Kanban columns)
 */
export enum TaskStatus {
  BACKLOG = 'backlog',
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  TESTING = 'testing',
  BLOCKED = 'blocked',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

/**
 * Task Priority
 * Indicates the urgency/importance of a task
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// TaskType enum has been removed - tasks are now categorized via labels instead

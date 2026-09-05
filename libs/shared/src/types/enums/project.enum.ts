/**
 * Project Status
 * Represents the current state of a project
 */
export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
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
  MEDIUM = 'medium',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}
/**
 * Milestone Display Status
 * Live-derived status for a milestone group, computed from its tasks.
 * Replaces the old MilestoneStatus enum which was stored on a separate entity.
 */
export type MilestoneDisplayStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'blocked'
  | 'no_tasks';

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
 * Represents the current state of a project task
 */
export enum TaskStatus {
  BACKLOG = 'backlog',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  DONE = 'done',
}

/**
 * Task Priority
 * Indicates the urgency/importance of a task
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

// TaskType enum has been removed - tasks are now categorized via labels instead

/**
 * The department a workflow step belongs to. Was free text on the admin screen,
 * which produced "Execution" alongside "execution" and a misspelled
 * "liasioning " with a trailing space -- all invisible to the type filter.
 * Values stay lowercase snake_case to match the rows already stored.
 */
export enum WorkflowStepType {
  DESIGN = 'design',
  LIAISONING = 'liaisoning',
  STORE = 'store',
  EXECUTION = 'execution',
  LOAN = 'loan',
  CHANGE_REQUEST = 'change_request',
}

export const WORKFLOW_STEP_TYPE_LABELS: Record<WorkflowStepType, string> = {
  [WorkflowStepType.DESIGN]: 'Design',
  [WorkflowStepType.LIAISONING]: 'Liaisoning',
  [WorkflowStepType.STORE]: 'Store',
  [WorkflowStepType.EXECUTION]: 'Execution',
  [WorkflowStepType.LOAN]: 'Loan',
  [WorkflowStepType.CHANGE_REQUEST]: 'Change Request',
};

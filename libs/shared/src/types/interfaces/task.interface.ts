import type {
  FileAttachment,
  TaskActivityEntry,
  TaskChecklist,
  TaskStatusConfig,
} from './project.interface';
import { type TaskPriority, TaskStatus } from '../enums/project.enum';

// ============================================================================
// Workflow Step
// ============================================================================

export interface WorkflowStep {
  id: string;
  name: string;
  code: string;
  description?: string;
  type?: string;
  defaultDepartment?: string;
  defaultRoleCode?: string;
  defaultMilestoneName?: string | null;
  defaultMilestoneOrder?: number | null;
  sequenceOrder: number;
  isMandatory: boolean;
  canRunParallel: boolean;
  dependsOnTaskCodes?: string[];
  effortDays?: number;
  checklistTemplate?: TaskChecklist;
  isActive: boolean;
  isSpecial?: boolean;
  changeRequestType?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// ============================================================================
// Project Task
// ============================================================================

export interface ProjectTask {
  id: string;
  projectId: string;
  milestoneName?: string | null;
  milestoneOrder?: number | null;
  workflowStepId?: string;
  name: string;
  code: string;
  description?: string;
  assignedToUserId?: string;
  kanbanOrder: number;
  startDate?: string;
  endDate?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dependsOnTaskIds?: string[];
  hasDependencyBlockers?: boolean;
  dependencyNames?: string[];
  dependencyCodes?: string[];
  completionPercentage: number;
  checklist?: TaskChecklist;
  attachments?: FileAttachment[];
  labels?: string[];
  watcherUserIds?: string[];
  blockedReason?: string;
  activityLog: TaskActivityEntry[];
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: string;
}

// ============================================================================
// My Tasks (cross-project views)
// ============================================================================

export interface ChecklistProgress {
  done: number;
  total: number;
}

export interface MyTask extends ProjectTask {
  projectNumber: string;
  projectName: string;
  milestoneName?: string;
  assigneeName?: string;
  urgencyScore?: number;
  isOverdue?: boolean;
  daysSinceLastUpdate?: number;
  checklistProgress?: ChecklistProgress;
  dependencyNames?: string[];
  dependencyCodes?: string[];
  hasDependencyBlockers?: boolean;
  projectTaskStatuses?: TaskStatusConfig[];
}

/** Slim task shape for My Tasks list rows (no activityLog, checklist, attachments). */
export interface MyTaskListItem {
  id: string;
  projectId: string;
  code: string;
  name: string;
  milestoneName?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  endDate?: string;
  completionPercentage: number;
  projectNumber: string;
  projectName: string;
  isOverdue?: boolean;
  daysSinceLastUpdate?: number;
  hasDependencyBlockers?: boolean;
  latestCommentPreview?: string;
}

export interface MyTasksProject {
  id: string;
  name: string;
  projectNumber: string;
}

export interface MyTasksProjectMeta {
  taskStatuses: TaskStatusConfig[];
}

export interface MyTasksSummary {
  total: number;
  overdue: number;
  dueToday: number;
  completedThisWeek: number;
}

export interface MyTasksGroup {
  key: string;
  label: string;
  count: number;
  variant: string;
  tasks: MyTaskListItem[];
}

export interface GroupedMyTasksResponse {
  groups: MyTasksGroup[];
  summary: MyTasksSummary;
  /** Status dropdown configs keyed by projectId (deduped from visible tasks). */
  projectMeta: Record<string, MyTasksProjectMeta>;
  /** Actionable projects for filter dropdown (unfiltered when list filters are active). */
  allProjects: MyTasksProject[];
}

export interface MyTasksGroupTasksResponse {
  tasks: MyTaskListItem[];
}

export type GroupByMode = 'dueDate' | 'priority' | 'project' | 'status';

export type DueDateFilter = 'overdue' | 'dueToday' | 'thisWeek';

export interface MyTaskFilters {
  groupBy?: GroupByMode;
  status?: string;
  priority?: string;
  projectId?: string;
  search?: string;
  dueDateFilter?: DueDateFilter;
  address?: string;
}

// ============================================================================
// Task Label Maps (shared between frontend & backend)
// ============================================================================

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  testing: 'Testing',
  blocked: 'Blocked',
  done: 'Done',
  cancelled: 'Cancelled',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

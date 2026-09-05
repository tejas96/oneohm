import type { FileAttachment, TaskActivityEntry, TaskChecklist } from './project.interface';
import { ChangeRequestType } from '../enums/change-request.enum';
import { type TaskPriority, TaskStatus, WorkflowStepType } from '../enums/project.enum';

// ============================================================================
// Workflow Step
// ============================================================================

export interface WorkflowStep {
  id: string;
  name: string;
  code: string;
  // Optional columns are nullable in the database, and the admin screen clears
  // one by sending an explicit null, so null is part of the shape both ways.
  description?: string | null;
  type?: WorkflowStepType | null;
  defaultDepartment?: string | null;
  defaultRoleCode?: string | null;
  defaultMilestoneName?: string | null;
  defaultMilestoneOrder?: number | null;
  sequenceOrder: number;
  isMandatory: boolean;
  canRunParallel: boolean;
  dependsOnTaskCodes?: string[];
  effortDays?: number | null;
  checklistTemplate?: TaskChecklist;
  isActive: boolean;
  isSpecial?: boolean;
  changeRequestType?: ChangeRequestType | null;
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
// Task Label Maps (re-exported from task catalog)
// ============================================================================

export { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '../../constants/task-catalog';

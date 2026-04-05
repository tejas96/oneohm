import type { FileAttachment, TaskActivityEntry, TaskChecklist } from './project.interface';
import { type MilestoneType, type TaskPriority, TaskStatus } from '../enums/project.enum';

// ============================================================================
// Workflow Step
// ============================================================================

export interface WorkflowStep {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string;
  type?: string;
  defaultDepartment?: string;
  defaultRoleCode?: string;
  defaultMilestoneType?: MilestoneType | null;
  sequenceOrder: number;
  isMandatory: boolean;
  canRunParallel: boolean;
  dependsOnTaskCodes?: string[];
  effortDays?: number;
  checklistTemplate?: TaskChecklist;
  isActive: boolean;
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
  milestoneId?: string;
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
  projects: MyTasksProject[];
}

export interface MyTasksGroup {
  key: string;
  label: string;
  count: number;
  variant: string;
  tasks: MyTask[];
}

export interface GroupedMyTasksResponse {
  groups: MyTasksGroup[];
  summary: MyTasksSummary;
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
}

// ============================================================================
// FSM Transitions (shared between frontend & backend)
// ============================================================================

export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.BACKLOG]: [TaskStatus.TODO],
  [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS, TaskStatus.BACKLOG],
  [TaskStatus.IN_PROGRESS]: [
    TaskStatus.IN_REVIEW,
    TaskStatus.BLOCKED,
    TaskStatus.DONE,
    TaskStatus.TESTING,
  ],
  [TaskStatus.IN_REVIEW]: [TaskStatus.DONE, TaskStatus.IN_PROGRESS],
  [TaskStatus.TESTING]: [TaskStatus.DONE, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED],
  [TaskStatus.BLOCKED]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
  [TaskStatus.DONE]: [TaskStatus.IN_PROGRESS],
  [TaskStatus.CANCELLED]: [TaskStatus.BACKLOG],
};

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

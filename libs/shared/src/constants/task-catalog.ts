import { TaskPriority, TaskStatus } from '../types/enums/project.enum';

export interface TaskStatusCatalogEntry {
  code: TaskStatus;
  label: string;
  color: string;
  orderIndex: number;
  variant: string;
  isFinal?: boolean;
  autoCompletePct?: number;
  autoSetStartDate?: boolean;
  autoSetEndDate?: boolean;
  /** When true, a task in this status blocks dependent tasks (blocksDependents !== false). */
  blocksDependents?: boolean;
  urgencyPenalty?: number;
}

export interface TaskPriorityCatalogEntry {
  code: TaskPriority;
  label: string;
  color: string;
  orderIndex: number;
  variant: string;
  urgencyWeight: number;
}

export interface TaskStatusOption {
  value: TaskStatus;
  label: string;
  color: string;
  orderIndex: number;
  variant: string;
}

export interface TaskPriorityOption {
  value: TaskPriority;
  label: string;
  color: string;
  orderIndex: number;
  variant: string;
}

/** Canonical task status catalog for all projects. */
export const TASK_STATUS_CATALOG: Record<TaskStatus, TaskStatusCatalogEntry> = {
  [TaskStatus.BACKLOG]: {
    code: TaskStatus.BACKLOG,
    label: 'Backlog',
    color: '#6B7280',
    orderIndex: 1,
    variant: 'secondary',
  },
  [TaskStatus.TODO]: {
    code: TaskStatus.TODO,
    label: 'To Do',
    color: '#6B7280',
    orderIndex: 2,
    variant: 'secondary',
  },
  [TaskStatus.IN_PROGRESS]: {
    code: TaskStatus.IN_PROGRESS,
    label: 'In Progress',
    color: '#3B82F6',
    orderIndex: 3,
    variant: 'info',
    autoSetStartDate: true,
    blocksDependents: true,
  },
  [TaskStatus.IN_REVIEW]: {
    code: TaskStatus.IN_REVIEW,
    label: 'In Review',
    color: '#F59E0B',
    orderIndex: 4,
    variant: 'warning',
    blocksDependents: true,
  },
  [TaskStatus.TESTING]: {
    code: TaskStatus.TESTING,
    label: 'Testing',
    color: '#3B82F6',
    orderIndex: 5,
    variant: 'info',
    blocksDependents: true,
  },
  [TaskStatus.BLOCKED]: {
    code: TaskStatus.BLOCKED,
    label: 'Blocked',
    color: '#EF4444',
    orderIndex: 6,
    variant: 'error',
    urgencyPenalty: 20,
    blocksDependents: true,
  },
  [TaskStatus.DONE]: {
    code: TaskStatus.DONE,
    label: 'Done',
    color: '#22C55E',
    orderIndex: 7,
    variant: 'success',
    isFinal: true,
    autoCompletePct: 100,
    autoSetEndDate: true,
    blocksDependents: false,
  },
  [TaskStatus.CANCELLED]: {
    code: TaskStatus.CANCELLED,
    label: 'Cancelled',
    color: '#EF4444',
    orderIndex: 8,
    variant: 'error',
    isFinal: true,
    autoSetEndDate: true,
    blocksDependents: false,
  },
};

/** Canonical task priority catalog for all projects. */
export const TASK_PRIORITY_CATALOG: Record<TaskPriority, TaskPriorityCatalogEntry> = {
  [TaskPriority.URGENT]: {
    code: TaskPriority.URGENT,
    label: 'Urgent',
    color: '#EF4444',
    orderIndex: 1,
    variant: 'error',
    urgencyWeight: 40,
  },
  [TaskPriority.HIGH]: {
    code: TaskPriority.HIGH,
    label: 'High',
    color: '#F59E0B',
    orderIndex: 2,
    variant: 'warning',
    urgencyWeight: 30,
  },
  [TaskPriority.MEDIUM]: {
    code: TaskPriority.MEDIUM,
    label: 'Medium',
    color: '#3B82F6',
    orderIndex: 3,
    variant: 'info',
    urgencyWeight: 15,
  },
  [TaskPriority.NORMAL]: {
    code: TaskPriority.NORMAL,
    label: 'Normal',
    color: '#6B7280',
    orderIndex: 4,
    variant: 'info',
    urgencyWeight: 20,
  },
  [TaskPriority.LOW]: {
    code: TaskPriority.LOW,
    label: 'Low',
    color: '#6B7280',
    orderIndex: 5,
    variant: 'secondary',
    urgencyWeight: 5,
  },
};

export const TASK_STATUS_OPTIONS: TaskStatusOption[] = Object.values(TASK_STATUS_CATALOG)
  .sort((a, b) => a.orderIndex - b.orderIndex)
  .map((e) => ({
    value: e.code,
    label: e.label,
    color: e.color,
    orderIndex: e.orderIndex,
    variant: e.variant,
  }));

export const TASK_PRIORITY_OPTIONS: TaskPriorityOption[] = Object.values(TASK_PRIORITY_CATALOG)
  .sort((a, b) => a.orderIndex - b.orderIndex)
  .map((e) => ({
    value: e.code,
    label: e.label,
    color: e.color,
    orderIndex: e.orderIndex,
    variant: e.variant,
  }));

export function getTaskStatusCatalogEntry(status: TaskStatus | string): TaskStatusCatalogEntry {
  const entry = TASK_STATUS_CATALOG[status as TaskStatus];
  if (!entry) {
    throw new Error(`Unknown task status: ${status}`);
  }
  return entry;
}

export function getTaskPriorityCatalogEntry(
  priority: TaskPriority | string,
): TaskPriorityCatalogEntry {
  const entry = TASK_PRIORITY_CATALOG[priority as TaskPriority];
  if (!entry) {
    throw new Error(`Unknown task priority: ${priority}`);
  }
  return entry;
}

export function isFinalTaskStatus(status: TaskStatus | string): boolean {
  const entry = TASK_STATUS_CATALOG[status as TaskStatus];
  return entry?.isFinal === true;
}

/**
 * A task *in* this status blocks dependent tasks.
 * Semantics: blocksDependents !== false (backlog/todo block; done/cancelled do not).
 */
export function taskStatusBlocksDependents(status: TaskStatus | string): boolean {
  const entry = TASK_STATUS_CATALOG[status as TaskStatus];
  if (!entry) return true;
  return entry.blocksDependents !== false;
}

/**
 * Moving *to* this status requires all dependencies to be resolved.
 * Matches workflow-engine: (blocksDependents === true && status !== blocked) ||
 * (isFinal && autoCompletePct === 100).
 */
export function taskStatusRequiresResolvedDependencies(status: TaskStatus | string): boolean {
  const entry = TASK_STATUS_CATALOG[status as TaskStatus];
  if (!entry) return false;
  return (
    (entry.blocksDependents === true && status !== TaskStatus.BLOCKED) ||
    (entry.isFinal === true && entry.autoCompletePct === 100)
  );
}

export function getCompleteTaskStatus(): TaskStatus {
  const found = Object.values(TASK_STATUS_CATALOG).find((e) => e.autoCompletePct === 100);
  return found?.code ?? TaskStatus.DONE;
}

/** Label maps derived from catalog (backward-compatible exports). */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = Object.fromEntries(
  Object.values(TASK_STATUS_CATALOG).map((e) => [e.code, e.label]),
) as Record<TaskStatus, string>;

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = Object.fromEntries(
  Object.values(TASK_PRIORITY_CATALOG).map((e) => [e.code, e.label]),
) as Record<TaskPriority, string>;

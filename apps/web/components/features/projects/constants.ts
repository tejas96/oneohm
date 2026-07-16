import { PROJECT_TYPE_LABELS as _PROJECT_TYPE_LABELS } from '@tejas96/shared/constants';
import {
  MaterialStatus,
  PaymentTransactionStatus,
  ProjectPriority,
  ProjectStatus,
  ProjectType,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TaskPriority,
  TaskStatus,
} from '@tejas96/shared/types';

import { toTitleLabel } from '@/lib/utils';

export const DEFAULT_MILESTONES: ReadonlyArray<{ name: string; order: number }> = [
  { name: 'Site Survey & Design', order: 1 },
  { name: 'Permits & Approvals', order: 2 },
  { name: 'Material Procurement', order: 3 },
  { name: 'Installation', order: 4 },
  { name: 'Commissioning & Testing', order: 5 },
  { name: 'Handover', order: 6 },
];

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  [ProjectStatus.PLANNING]: 'Planning',
  [ProjectStatus.ACTIVE]: 'Active',
  [ProjectStatus.ON_HOLD]: 'On Hold',
  [ProjectStatus.COMPLETED]: 'Completed',
  [ProjectStatus.CANCELLED]: 'Cancelled',
};

export const PROJECT_STATUS_BADGE_VARIANT: Record<string, string> = {
  [ProjectStatus.PLANNING]: 'blue-subtle',
  [ProjectStatus.ACTIVE]: 'green-subtle',
  [ProjectStatus.ON_HOLD]: 'amber',
  [ProjectStatus.COMPLETED]: 'success',
  [ProjectStatus.CANCELLED]: 'red-subtle',
};

export const PROJECT_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  [ProjectStatus.PLANNING]: [ProjectStatus.ACTIVE, ProjectStatus.CANCELLED],
  [ProjectStatus.ACTIVE]: [ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
  [ProjectStatus.ON_HOLD]: [ProjectStatus.ACTIVE, ProjectStatus.CANCELLED],
  [ProjectStatus.COMPLETED]: [ProjectStatus.ACTIVE],
  [ProjectStatus.CANCELLED]: [ProjectStatus.ACTIVE],
};

export const PROJECT_PRIORITY_LABELS: Record<string, string> = {
  [ProjectPriority.LOW]: 'Low',
  [ProjectPriority.NORMAL]: 'Normal',
  [ProjectPriority.HIGH]: 'High',
  [ProjectPriority.URGENT]: 'Urgent',
};

export const PROJECT_PRIORITY_BADGE_VARIANT: Record<string, string> = {
  [ProjectPriority.LOW]: 'muted',
  [ProjectPriority.NORMAL]: 'secondary',
  [ProjectPriority.HIGH]: 'warning',
  [ProjectPriority.URGENT]: 'error',
};

export const PROJECT_TYPE_LABELS: Record<string, string> = _PROJECT_TYPE_LABELS;

export const PROJECT_TYPE_BADGE_VARIANT: Record<string, string> = {
  [ProjectType.RESIDENTIAL]: 'teal',
  [ProjectType.RESIDENTIAL_APARTMENT]: 'teal',
  [ProjectType.COMMERCIAL]: 'purple',
  [ProjectType.INDUSTRIAL]: 'amber',
  [ProjectType.AGRICULTURAL]: 'green-subtle',
};

export const HEALTH_STATUS_LABELS: Record<string, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  delayed: 'Delayed',
};

export const HEALTH_STATUS_BADGE_VARIANT: Record<string, string> = {
  on_track: 'green-subtle',
  at_risk: 'amber',
  delayed: 'red-subtle',
};

export const HEALTH_STATUS_PROGRESS_VARIANT: Record<
  string,
  'primary' | 'success' | 'warning' | 'error'
> = {
  on_track: 'primary',
  at_risk: 'warning',
  delayed: 'error',
};

/**
 * Phase labels passthrough — currentPhase is now a free-text milestone name string,
 * not a MilestoneType enum. This identity map is kept so any consumers that do
 * `PHASE_LABELS[phase] ?? phase` continue to work without change.
 */
export function PHASE_LABELS(phase: string | null | undefined): string {
  return phase ?? '';
}

/**
 * AdvancedTable select filterOptions — enum-driven, stays in sync automatically.
 * Use these in ColumnConfig.filterOptions for the project list AdvancedTable.
 *
 * Health-based filters use composite values ('health:delayed', 'health:at_risk')
 * which are decoded in toProjectFilters() to set both status and healthStatus.
 */
export const PROJECT_STATUS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  ...Object.values(ProjectStatus).map((v) => ({
    value: v,
    label: PROJECT_STATUS_LABELS[v] ?? toTitleLabel(v),
  })),
  { value: 'health:delayed', label: 'Overdue' },
  { value: 'health:at_risk', label: 'At Risk' },
];

export const PROJECT_PRIORITY_OPTIONS: ReadonlyArray<{ value: ProjectPriority; label: string }> =
  Object.values(ProjectPriority).map((v) => ({
    value: v,
    label: PROJECT_PRIORITY_LABELS[v] ?? toTitleLabel(v),
  }));

export const PROJECT_TYPE_OPTIONS: ReadonlyArray<{ value: ProjectType; label: string }> =
  Object.values(ProjectType).map((v) => ({
    value: v,
    label: PROJECT_TYPE_LABELS[v] ?? toTitleLabel(v),
  }));

// ---------------------------------------------------------------------------
// Task constants (for My Tasks)
// Labels imported from @tejas96/shared/types and re-exported for convenience
// ---------------------------------------------------------------------------

export { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS };

export const TASK_PRIORITY_DOT_COLOR: Record<string, string> = {
  [TaskPriority.LOW]: 'bg-foreground-tertiary',
  [TaskPriority.NORMAL]: 'bg-info',
  [TaskPriority.MEDIUM]: 'bg-info',
  [TaskPriority.HIGH]: 'bg-warning',
  [TaskPriority.URGENT]: 'bg-error',
};

/** Hex colors matching the Tailwind semantic tokens above — used for inline styles (e.g. MUI).
 *  Must stay in sync with the CSS token values in tailwind.config.ts:
 *  --color-info (#3b82f6), --color-warning (#f59e0b), --color-error (#ef4444). */
export const TASK_PRIORITY_HEX_COLOR: Record<string, string> = {
  [TaskPriority.LOW]: '#94a3b8',
  [TaskPriority.NORMAL]: '#3b82f6',
  [TaskPriority.MEDIUM]: '#3b82f6',
  [TaskPriority.HIGH]: '#f59e0b',
  [TaskPriority.URGENT]: '#ef4444',
};

export const TASK_GROUP_BY_OPTIONS = [
  { value: 'dueDate', label: 'Group by: Due Date' },
  { value: 'priority', label: 'Group by: Priority' },
  { value: 'project', label: 'Group by: Project' },
  { value: 'status', label: 'Group by: Status' },
] as const;

export const TASK_GROUP_VARIANT_MAP: Record<
  string,
  { dot: string; border: string; leftBorder: string; badge: string }
> = {
  // Due date groups
  overdue: {
    dot: 'bg-error',
    border: 'border-border-light',
    leftBorder: 'border-l-error',
    badge: 'error',
  },
  due_today: {
    dot: 'bg-warning',
    border: 'border-border-light',
    leftBorder: 'border-l-warning',
    badge: 'warning',
  },
  this_week: {
    dot: 'bg-info',
    border: 'border-border-light',
    leftBorder: 'border-l-info',
    badge: 'info',
  },
  later: {
    dot: 'bg-success',
    border: 'border-border-light',
    leftBorder: 'border-l-success',
    badge: 'success',
  },
  no_date: {
    dot: 'bg-foreground-tertiary',
    border: 'border-border-light',
    leftBorder: 'border-l-border',
    badge: 'secondary',
  },
  // Status groups
  [TaskStatus.BLOCKED]: {
    dot: 'bg-error',
    border: 'border-border-light',
    leftBorder: 'border-l-error',
    badge: 'error',
  },
  [TaskStatus.IN_REVIEW]: {
    dot: 'bg-warning',
    border: 'border-border-light',
    leftBorder: 'border-l-warning',
    badge: 'warning',
  },
  [TaskStatus.IN_PROGRESS]: {
    dot: 'bg-info',
    border: 'border-border-light',
    leftBorder: 'border-l-info',
    badge: 'info',
  },
  [TaskStatus.TODO]: {
    dot: 'bg-foreground-tertiary',
    border: 'border-border-light',
    leftBorder: 'border-l-border',
    badge: 'secondary',
  },
  [TaskStatus.TESTING]: {
    dot: 'bg-primary',
    border: 'border-border-light',
    leftBorder: 'border-l-primary',
    badge: 'info',
  },
  [TaskStatus.BACKLOG]: {
    dot: 'bg-foreground-tertiary',
    border: 'border-border-light',
    leftBorder: 'border-l-border',
    badge: 'secondary',
  },
  // Priority groups
  [TaskPriority.URGENT]: {
    dot: 'bg-error',
    border: 'border-border-light',
    leftBorder: 'border-l-error',
    badge: 'error',
  },
  [TaskPriority.HIGH]: {
    dot: 'bg-warning',
    border: 'border-border-light',
    leftBorder: 'border-l-warning',
    badge: 'warning',
  },
  [TaskPriority.MEDIUM]: {
    dot: 'bg-info',
    border: 'border-border-light',
    leftBorder: 'border-l-info',
    badge: 'info',
  },
  [TaskPriority.LOW]: {
    dot: 'bg-foreground-tertiary',
    border: 'border-border-light',
    leftBorder: 'border-l-border',
    badge: 'secondary',
  },
};

export const SMART_EXPAND_DEFAULTS: Record<string, Record<string, boolean>> = {
  dueDate: { overdue: true, due_today: true, this_week: true, later: false, no_date: false },
  priority: {
    [TaskPriority.URGENT]: true,
    [TaskPriority.HIGH]: true,
    [TaskPriority.MEDIUM]: false,
    [TaskPriority.LOW]: false,
  },
  status: {
    [TaskStatus.BLOCKED]: true,
    [TaskStatus.IN_PROGRESS]: true,
    [TaskStatus.IN_REVIEW]: false,
    [TaskStatus.TODO]: false,
    [TaskStatus.TESTING]: false,
    [TaskStatus.BACKLOG]: false,
  },
  project: {},
};

export const STALE_THRESHOLDS: Record<string, number> = {
  [TaskStatus.IN_PROGRESS]: 3,
  [TaskStatus.BLOCKED]: 2,
  [TaskStatus.IN_REVIEW]: 5,
  [TaskStatus.TODO]: 7,
};

export interface QuickFilterChip {
  key: string;
  label: string;
  filter: { status?: string; priority?: string; dueDateFilter?: string };
}

// ---------------------------------------------------------------------------
// Payment constants (for Project Detail - Payments tab)
// ---------------------------------------------------------------------------

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  [PaymentTransactionStatus.PENDING]: 'Pending',
  [PaymentTransactionStatus.RECEIVED]: 'Received',
  [PaymentTransactionStatus.VERIFIED]: 'Verified',
  [PaymentTransactionStatus.CLEARED]: 'Cleared',
  [PaymentTransactionStatus.BOUNCED]: 'Bounced',
  [PaymentTransactionStatus.REFUNDED]: 'Refunded',
};

export const PAYMENT_STATUS_BADGE_VARIANT: Record<string, string> = {
  [PaymentTransactionStatus.PENDING]: 'warning',
  [PaymentTransactionStatus.RECEIVED]: 'info',
  [PaymentTransactionStatus.VERIFIED]: 'green-subtle',
  [PaymentTransactionStatus.CLEARED]: 'success',
  [PaymentTransactionStatus.BOUNCED]: 'error',
  [PaymentTransactionStatus.REFUNDED]: 'red-subtle',
};

// ---------------------------------------------------------------------------
// Material constants (for Project Detail - BOM tab)
// ---------------------------------------------------------------------------

export const MATERIAL_STATUS_LABELS: Record<string, string> = {
  [MaterialStatus.REQUIRED]: 'Required',
  [MaterialStatus.ORDERED]: 'Ordered',
  [MaterialStatus.IN_TRANSIT]: 'In Transit',
  [MaterialStatus.ALLOCATED]: 'Allocated',
  [MaterialStatus.USED]: 'Used',
};

export const MATERIAL_STATUS_BADGE_VARIANT: Record<string, string> = {
  [MaterialStatus.REQUIRED]: 'secondary',
  [MaterialStatus.ORDERED]: 'info',
  [MaterialStatus.IN_TRANSIT]: 'amber',
  [MaterialStatus.ALLOCATED]: 'green-subtle',
  [MaterialStatus.USED]: 'success',
};

// Survey constants removed – survey data now accessed via CustomerPropertyEntity

// ---------------------------------------------------------------------------
// Display limits
// ---------------------------------------------------------------------------

export const MAX_DISPLAYED_TEAM_MEMBERS = 5;
export const MAX_DISPLAYED_MILESTONES = 6;
export const MAX_TASKS_PER_COLUMN = 3;
export const TASKS_PAGE_SIZE = 20;

/** Maximum tasks fetched in board view. Avoids unbounded queries while
 *  accommodating real-world project sizes. Increase if needed. */
export const KANBAN_BOARD_LIMIT = 500;

/**
 * Base query key for the project task list (FDAL resource).
 * Must stay in sync with the key used in lib/hooks/resources/projects.ts.
 */
export const PROJECT_TASKS_QUERY_KEY = (organizationId: string | undefined) =>
  ['project-tasks', organizationId] as const;

/**
 * Query key for the milestone aggregation endpoint.
 * Invalidate alongside PROJECT_TASKS_QUERY_KEY whenever tasks change.
 */
export const PROJECT_MILESTONE_AGG_QUERY_KEY = (projectId: string | undefined) =>
  ['project-milestones', projectId] as const;

export const MS_PER_DAY = 86_400_000;

// ---------------------------------------------------------------------------
// Project Detail Tab Configuration
// ---------------------------------------------------------------------------

export const PROJECT_DETAIL_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'summary', label: 'Summary' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'documents', label: 'Documents' },
  { value: 'finance', label: 'Finance' },
  { value: 'bom', label: 'BOM & Inventory' },
  { value: 'allocations', label: 'Allocations' },
  { value: 'reports', label: 'Reports' },
  { value: 'surveys', label: 'Surveys' },
] as const;

export type ProjectDetailTab = (typeof PROJECT_DETAIL_TABS)[number]['value'];

// ---------------------------------------------------------------------------
// Task List (List View) filter defaults — used by useUrlFilters
// ---------------------------------------------------------------------------

export const TASK_LIST_FILTER_DEFAULTS = {
  t_search: '',
  t_status: '',
  t_priority: '',
  t_assignee: '',
  t_milestone: '',
  t_page: '1',
  t_view: 'list', // 'list' or 'board'
} as const;

export type TaskListFilters = typeof TASK_LIST_FILTER_DEFAULTS;

/**
 * Sentinel value used in URL/query filters to represent tasks with no assignee.
 * Kept explicit (instead of empty string) so deep-links can preserve intent.
 */
export const UNASSIGNED_TASK_FILTER: string = '__unassigned__';

/**
 * Task view modes
 */
export const TASK_VIEW_MODES = {
  LIST: 'list',
  BOARD: 'board',
} as const;

export type TaskViewMode = (typeof TASK_VIEW_MODES)[keyof typeof TASK_VIEW_MODES];

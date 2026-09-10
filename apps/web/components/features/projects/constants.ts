import { PROJECT_TYPE_LABELS as _PROJECT_TYPE_LABELS } from '@tejas96/shared/constants';
import {
  ProjectPriority,
  ProjectStatus,
  ProjectType,
  TASK_STATUS_LABELS,
  TaskPriority,
  TaskStatus,
} from '@tejas96/shared/types';

import type { Gate } from '@/lib/rbac/catalog';
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
  [ProjectStatus.PLANNING]: [ProjectStatus.ACTIVE],
  [ProjectStatus.ACTIVE]: [ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED],
  [ProjectStatus.ON_HOLD]: [ProjectStatus.ACTIVE],
  [ProjectStatus.COMPLETED]: [ProjectStatus.ACTIVE],
  [ProjectStatus.CANCELLED]: [],
};

export const PROJECT_PRIORITY_LABELS: Record<string, string> = {
  [ProjectPriority.LOW]: 'Low',
  [ProjectPriority.NORMAL]: 'Normal',
  [ProjectPriority.HIGH]: 'High',
  [ProjectPriority.URGENT]: 'Urgent',
};

export const PROJECT_TYPE_LABELS: Record<string, string> = _PROJECT_TYPE_LABELS;

export const HEALTH_STATUS_LABELS: Record<string, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  delayed: 'Delayed',
};

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

export { TASK_STATUS_LABELS };

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
  [TaskStatus.IN_PROGRESS]: {
    dot: 'bg-info',
    border: 'border-border-light',
    leftBorder: 'border-l-info',
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

/** When groupBy=project exceeds this count, tasks load on group expand. */
/** Initial number of project group headers rendered before "Load more groups". */
export const VISIBLE_GROUPS_BATCH = 30;

/** Max project groups auto-expanded (and fetched) on load in lazy mode. */
export const LAZY_PROJECT_INITIAL_EXPAND_COUNT = 3;

/** Debounce delays for My Tasks text filters (ms). */
export const MY_TASKS_SEARCH_DEBOUNCE_MS = 700;
export const MY_TASKS_ADDRESS_DEBOUNCE_MS = 700;

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
    [TaskStatus.BACKLOG]: false,
    [TaskStatus.DONE]: false,
  },
  project: {},
};

export const STALE_THRESHOLDS: Record<string, number> = {
  [TaskStatus.IN_PROGRESS]: 3,
  [TaskStatus.BLOCKED]: 2,
  [TaskStatus.BACKLOG]: 7,
};

// ---------------------------------------------------------------------------
// Payment constants (for Project Detail - Payments tab)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Material constants (for Project Detail - BOM tab)
// ---------------------------------------------------------------------------

// Survey constants removed – survey data now accessed via CustomerPropertyEntity

// ---------------------------------------------------------------------------
// Display limits
// ---------------------------------------------------------------------------

export const TASKS_PAGE_SIZE = 20;

/** Maximum tasks fetched in board view. Avoids unbounded queries while
 *  accommodating real-world project sizes. Increase if needed. */
export const KANBAN_BOARD_LIMIT = 500;

/**
 * Base query key for the project task list (FDAL resource).
 * Must stay in sync with the key used in lib/hooks/resources/projects.ts.
 */
export const PROJECT_TASKS_QUERY_KEY = () => ['project-tasks'] as const;

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

/**
 * `summary` is gone. Four of its six panels were re-skins of Overview panels
 * fed by the same `/analytics/summary` query — milestone progress, team
 * workload, recent activity and the metric tiles all had a twin — and its two
 * task charts now live on Overview as the Task mix card. A `?tab=summary`
 * bookmark falls through to Overview, which is where its content went.
 */
export const PROJECT_DETAIL_TABS = [
  { value: 'overview', label: 'Overview', permission: 'projects.view' },
  { value: 'tasks', label: 'Tasks', permission: 'projects.view' },
  { value: 'documents', label: 'Documents', permission: 'projects.view' },
  { value: 'finance', label: 'Finance', permission: 'finance.view' },
  { value: 'bom', label: 'BOM & Inventory', permission: 'inventory.view' },
  { value: 'allocations', label: 'Allocations', permission: 'inventory.view' },
  { value: 'reports', label: 'Reports', permission: 'projects.view' },
  { value: 'surveys', label: 'Surveys', permission: 'projects.view' },
  { value: 'service', label: 'Service Tickets', permission: 'service.view' },
] as const satisfies readonly {
  value: string;
  label: string;
  permission: Gate;
}[];

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

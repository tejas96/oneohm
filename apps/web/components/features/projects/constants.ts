import {
  MilestoneType,
  ProjectPriority,
  ProjectStatus,
  ProjectType,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TaskPriority,
  TaskStatus,
} from '@oneohm-epc/shared-types';

export const DEFAULT_MILESTONES = [
  { name: 'Site Survey & Design', type: MilestoneType.SITE_SURVEY },
  { name: 'Permits & Approvals', type: MilestoneType.PERMITS },
  { name: 'Material Procurement', type: MilestoneType.MATERIAL_PROCUREMENT },
  { name: 'Installation', type: MilestoneType.INSTALLATION },
  { name: 'Commissioning & Testing', type: MilestoneType.COMMISSIONING },
  { name: 'Handover', type: MilestoneType.HANDOVER },
] as const;

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  [ProjectStatus.DRAFT]: 'Draft',
  [ProjectStatus.PLANNING]: 'Planning',
  [ProjectStatus.APPROVED]: 'Approved',
  [ProjectStatus.IN_PROGRESS]: 'Active',
  [ProjectStatus.TESTING]: 'Testing',
  [ProjectStatus.ON_HOLD]: 'On Hold',
  [ProjectStatus.COMPLETED]: 'Completed',
  [ProjectStatus.CANCELLED]: 'Cancelled',
};

export const PROJECT_STATUS_BADGE_VARIANT: Record<string, string> = {
  [ProjectStatus.DRAFT]: 'secondary',
  [ProjectStatus.PLANNING]: 'blue-subtle',
  [ProjectStatus.APPROVED]: 'green-subtle',
  [ProjectStatus.IN_PROGRESS]: 'green-subtle',
  [ProjectStatus.TESTING]: 'purple',
  [ProjectStatus.ON_HOLD]: 'amber',
  [ProjectStatus.COMPLETED]: 'blue-subtle',
  [ProjectStatus.CANCELLED]: 'red-subtle',
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

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  [ProjectType.RESIDENTIAL]: 'Residential',
  [ProjectType.RESIDENTIAL_APARTMENT]: 'Residential Apt',
  [ProjectType.COMMERCIAL]: 'Commercial',
  [ProjectType.INDUSTRIAL]: 'Industrial',
  [ProjectType.AGRICULTURAL]: 'Agricultural',
};

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

export const HEALTH_STATUS_PROGRESS_VARIANT: Record<string, 'primary' | 'success' | 'warning' | 'error'> = {
  on_track: 'primary',
  at_risk: 'warning',
  delayed: 'error',
};

export const PHASE_LABELS: Record<string, string> = {
  [MilestoneType.SITE_SURVEY]: 'Site Survey',
  [MilestoneType.DESIGN]: 'Design',
  [MilestoneType.PLANNING]: 'Planning',
  [MilestoneType.APPROVAL]: 'Approval',
  [MilestoneType.PERMITS]: 'Permits',
  [MilestoneType.MATERIAL_PROCUREMENT]: 'Procurement',
  [MilestoneType.ELECTRICAL]: 'Electrical',
  [MilestoneType.INSTALLATION]: 'Installation',
  [MilestoneType.INSPECTION]: 'Inspection',
  [MilestoneType.TESTING]: 'Testing',
  [MilestoneType.COMMISSIONING]: 'Commissioning',
  [MilestoneType.MONITORING]: 'Monitoring',
  [MilestoneType.HANDOVER]: 'Handover',
  [MilestoneType.CUSTOM]: 'Custom',
};

export const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: ProjectStatus.DRAFT, label: 'Draft' },
  { value: ProjectStatus.PLANNING, label: 'Planning' },
  { value: ProjectStatus.APPROVED, label: 'Approved' },
  { value: ProjectStatus.IN_PROGRESS, label: 'Active' },
  { value: ProjectStatus.TESTING, label: 'Testing' },
  { value: ProjectStatus.ON_HOLD, label: 'On Hold' },
  { value: ProjectStatus.COMPLETED, label: 'Completed' },
  { value: ProjectStatus.CANCELLED, label: 'Cancelled' },
] as const;

export const PRIORITY_FILTER_OPTIONS = [
  { value: '', label: 'All Priority' },
  { value: ProjectPriority.URGENT, label: 'Urgent' },
  { value: ProjectPriority.HIGH, label: 'High' },
  { value: ProjectPriority.NORMAL, label: 'Normal' },
  { value: ProjectPriority.LOW, label: 'Low' },
] as const;

export const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'residential', label: 'Residential' },
  { value: 'residential_apartment', label: 'Residential Apt' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'agricultural', label: 'Agricultural' },
] as const;

// ---------------------------------------------------------------------------
// Task constants (for My Tasks)
// Labels imported from @oneohm-epc/shared-types and re-exported for convenience
// ---------------------------------------------------------------------------

export { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS };

export const TASK_STATUS_BADGE_VARIANT: Record<string, string> = {
  [TaskStatus.BACKLOG]: 'secondary',
  [TaskStatus.TODO]: 'secondary',
  [TaskStatus.IN_PROGRESS]: 'info',
  [TaskStatus.IN_REVIEW]: 'amber',
  [TaskStatus.TESTING]: 'purple',
  [TaskStatus.BLOCKED]: 'error',
  [TaskStatus.DONE]: 'success',
  [TaskStatus.CANCELLED]: 'muted',
};

export const TASK_STATUS_DOT_COLOR: Record<string, string> = {
  [TaskStatus.BACKLOG]: 'bg-foreground-tertiary',
  [TaskStatus.TODO]: 'bg-foreground-tertiary',
  [TaskStatus.IN_PROGRESS]: 'bg-info',
  [TaskStatus.IN_REVIEW]: 'bg-warning',
  [TaskStatus.TESTING]: 'bg-primary',
  [TaskStatus.BLOCKED]: 'bg-error',
  [TaskStatus.DONE]: 'bg-success',
  [TaskStatus.CANCELLED]: 'bg-foreground-muted',
};

export const TASK_PRIORITY_BADGE_VARIANT: Record<string, string> = {
  [TaskPriority.LOW]: 'secondary',
  [TaskPriority.MEDIUM]: 'info',
  [TaskPriority.HIGH]: 'warning',
  [TaskPriority.URGENT]: 'error',
};

export const TASK_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: TaskStatus.BACKLOG, label: 'Backlog' },
  { value: TaskStatus.TODO, label: 'To Do' },
  { value: TaskStatus.IN_PROGRESS, label: 'In Progress' },
  { value: TaskStatus.IN_REVIEW, label: 'In Review' },
  { value: TaskStatus.TESTING, label: 'Testing' },
  { value: TaskStatus.BLOCKED, label: 'Blocked' },
] as const;

export const TASK_GROUP_BY_OPTIONS = [
  { value: 'dueDate', label: 'Group by: Due Date' },
  { value: 'priority', label: 'Group by: Priority' },
  { value: 'project', label: 'Group by: Project' },
  { value: 'status', label: 'Group by: Status' },
] as const;

export function getDueDateColor(endDate?: string): string {
  if (!endDate) return 'text-foreground-tertiary';
  const d = new Date(endDate);
  d.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (d < now) return 'text-error';
  if (d.getTime() === now.getTime()) return 'text-warning';
  return 'text-foreground-secondary';
}

export const TASK_GROUP_VARIANT_MAP: Record<string, { dot: string; border: string; badge: string }> = {
  overdue: { dot: 'bg-error', border: 'border-error/30', badge: 'error' },
  due_today: { dot: 'bg-warning', border: 'border-warning/30', badge: 'warning' },
  this_week: { dot: 'bg-info', border: 'border-info/30', badge: 'info' },
  later: { dot: 'bg-success', border: 'border-success/30', badge: 'success' },
  no_date: { dot: 'bg-foreground-tertiary', border: 'border-border-light', badge: 'secondary' },
};

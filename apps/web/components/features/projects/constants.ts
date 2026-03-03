import {
  MaterialStatus,
  MilestoneType,
  PaymentTransactionStatus,
  ProjectPriority,
  ProjectStatus,
  ProjectType,
  SiteSurveyStatus,
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

export const HEALTH_STATUS_PROGRESS_VARIANT: Record<
  string,
  'primary' | 'success' | 'warning' | 'error'
> = {
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

export const TASK_PRIORITY_DOT_COLOR: Record<string, string> = {
  [TaskPriority.LOW]: 'bg-foreground-tertiary',
  [TaskPriority.MEDIUM]: 'bg-info',
  [TaskPriority.HIGH]: 'bg-warning',
  [TaskPriority.URGENT]: 'bg-error',
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

export const NEXT_ACTION_HINTS: Record<string, string> = {
  [TaskStatus.BACKLOG]: 'Move to To Do when ready',
  [TaskStatus.TODO]: 'Start working on this',
  [TaskStatus.IN_PROGRESS]: 'Submit for review when done',
  [TaskStatus.IN_REVIEW]: 'Awaiting reviewer feedback',
  [TaskStatus.TESTING]: 'Verify and mark done',
  [TaskStatus.BLOCKED]: 'Resolve blocker',
};

export const STALE_THRESHOLDS: Record<string, number> = {
  [TaskStatus.IN_PROGRESS]: 3,
  [TaskStatus.BLOCKED]: 2,
  [TaskStatus.IN_REVIEW]: 5,
  [TaskStatus.TODO]: 7,
};

export const TASK_PRIORITY_FILTER_OPTIONS = [
  { value: '', label: 'All Priority' },
  { value: TaskPriority.URGENT, label: 'Urgent' },
  { value: TaskPriority.HIGH, label: 'High' },
  { value: TaskPriority.MEDIUM, label: 'Medium' },
  { value: TaskPriority.LOW, label: 'Low' },
] as const;

export interface QuickFilterChip {
  key: string;
  label: string;
  filter: { status?: string; priority?: string; dueDateFilter?: string };
}

export const QUICK_FILTER_CHIPS: QuickFilterChip[] = [
  { key: 'all', label: 'All', filter: {} },
  { key: 'overdue', label: 'Overdue', filter: { dueDateFilter: 'overdue' } },
  { key: 'due-today', label: 'Due Today', filter: { dueDateFilter: 'dueToday' } },
  { key: 'blocked', label: 'Blocked', filter: { status: TaskStatus.BLOCKED } },
  { key: 'high-priority', label: 'High/Urgent', filter: { priority: TaskPriority.HIGH } },
];

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

// ---------------------------------------------------------------------------
// Document category map
// ---------------------------------------------------------------------------

export const DOCUMENT_CATEGORY_MAP: Record<string, string> = {
  contract: 'Contracts & Agreements',
  agreement: 'Contracts & Agreements',
  nda: 'Contracts & Agreements',
  quote: 'Proposals & Quotes',
  proposal: 'Proposals & Quotes',
  invoice: 'Financial',
  payment_receipt: 'Financial',
  wcr: 'Work Completion',
  wcr_preliminary: 'Work Completion',
  wcr_final: 'Work Completion',
  site_survey: 'Technical',
  technical_drawing: 'Technical',
  installation_manual: 'Technical',
  compliance_certificate: 'Compliance',
  approval_letter: 'Compliance',
  inspection_report: 'Compliance',
  identity_proof: 'Customer Documents',
  address_proof: 'Customer Documents',
  electricity_bill: 'Customer Documents',
  loan_application: 'Loan & Subsidy',
  loan_sanction: 'Loan & Subsidy',
  loan_agreement: 'Loan & Subsidy',
  subsidy_application: 'Loan & Subsidy',
  subsidy_approval: 'Loan & Subsidy',
  maintenance_report: 'Service',
  service_report: 'Service',
  warranty_certificate: 'Service',
  other: 'Other',
};

export const DOCUMENT_CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Contracts & Agreements': { bg: 'bg-info/10', text: 'text-info' },
  'Proposals & Quotes': { bg: 'bg-success/10', text: 'text-success' },
  Financial: { bg: 'bg-warning/10', text: 'text-warning' },
  'Work Completion': { bg: 'bg-primary/10', text: 'text-primary' },
  Technical: { bg: 'bg-info/10', text: 'text-info' },
  Compliance: { bg: 'bg-error/10', text: 'text-error' },
  'Customer Documents': { bg: 'bg-info/10', text: 'text-info' },
  'Loan & Subsidy': { bg: 'bg-success/10', text: 'text-success' },
  Service: { bg: 'bg-primary/10', text: 'text-primary' },
  Other: { bg: 'bg-muted', text: 'text-foreground-secondary' },
};

// ---------------------------------------------------------------------------
// Survey constants (for Project Detail - Surveys tab)
// ---------------------------------------------------------------------------

export const SURVEY_STATUS_LABELS: Record<string, string> = {
  [SiteSurveyStatus.SCHEDULED]: 'Scheduled',
  [SiteSurveyStatus.IN_PROGRESS]: 'In Progress',
  [SiteSurveyStatus.COMPLETED]: 'Completed',
  [SiteSurveyStatus.CANCELLED]: 'Cancelled',
};

export const SURVEY_STATUS_BADGE_VARIANT: Record<string, string> = {
  [SiteSurveyStatus.SCHEDULED]: 'info',
  [SiteSurveyStatus.IN_PROGRESS]: 'warning',
  [SiteSurveyStatus.COMPLETED]: 'success',
  [SiteSurveyStatus.CANCELLED]: 'red-subtle',
};

// ---------------------------------------------------------------------------
// Milestone payment status (for Overview - Milestones card)
// ---------------------------------------------------------------------------

export const MILESTONE_PAYMENT_STATUS_BADGE: Record<string, string> = {
  received: 'success',
  due: 'warning',
  pending: 'secondary',
};

export const MILESTONE_PAYMENT_STATUS_LABELS: Record<string, string> = {
  received: 'Received',
  due: 'Due',
  pending: 'Pending',
};

// ---------------------------------------------------------------------------
// Display limits
// ---------------------------------------------------------------------------

export const MAX_DISPLAYED_TEAM_MEMBERS = 5;
export const MAX_DISPLAYED_MILESTONES = 6;
export const MAX_TASKS_PER_COLUMN = 3;
export const TASKS_PAGE_SIZE = 20;
export const KANBAN_TASKS_LIMIT = 100;
export const MS_PER_DAY = 86_400_000;

// ---------------------------------------------------------------------------
// Project Detail Tab Configuration
// ---------------------------------------------------------------------------

export const PROJECT_DETAIL_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'documents', label: 'Documents' },
  { value: 'payments', label: 'Payments' },
  { value: 'bom', label: 'BOM & Inventory' },
  { value: 'communication', label: 'Communication' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'surveys', label: 'Surveys' },
  { value: 'activity', label: 'Activity' },
] as const;

export type ProjectDetailTab = (typeof PROJECT_DETAIL_TABS)[number]['value'];

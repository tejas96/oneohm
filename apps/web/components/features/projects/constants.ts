import { MilestoneType, ProjectPriority, ProjectStatus } from '@oneohm-epc/shared-types';

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
  residential: 'Residential',
  residential_apartment: 'Residential Apt',
  commercial: 'Commercial',
  industrial: 'Industrial',
};

export const PROJECT_TYPE_BADGE_VARIANT: Record<string, string> = {
  residential: 'teal',
  residential_apartment: 'teal',
  commercial: 'purple',
  industrial: 'amber',
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
  [MilestoneType.APPROVAL]: 'Approval',
  [MilestoneType.MATERIAL_PROCUREMENT]: 'Procurement',
  [MilestoneType.INSTALLATION]: 'Installation',
  [MilestoneType.TESTING]: 'Testing',
  [MilestoneType.COMMISSIONING]: 'Commissioning',
  [MilestoneType.HANDOVER]: 'Handover',
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
] as const;

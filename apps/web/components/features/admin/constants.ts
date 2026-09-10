import type { FilterTab } from '@/components/shared';

export const USER_STATUS_VARIANTS: Record<string, string> = {
  active: 'success',
  inactive: 'secondary',
  suspended: 'error',
  archived: 'secondary',
};

export const USER_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
  archived: 'Archived',
};

export const ROLE_TYPE_TABS: FilterTab<string>[] = [
  { id: 'all', label: 'All' },
  { id: 'system', label: 'System' },
  { id: 'custom', label: 'Custom' },
];

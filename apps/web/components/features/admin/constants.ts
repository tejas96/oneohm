import type { FilterTab } from '@/components/shared';

export const USER_STATUS_VARIANTS: Record<string, string> = {
  active: 'success',
  inactive: 'secondary',
  suspended: 'error',
};

export const USER_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
};

export const USER_STATUS_TABS: FilterTab<string>[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'archived', label: 'Archived' },
];

export const ROLE_TYPE_TABS: FilterTab<string>[] = [
  { id: 'all', label: 'All' },
  { id: 'system', label: 'System' },
  { id: 'custom', label: 'Custom' },
];

export const PERMISSION_ACTION_OPTIONS = [
  { value: 'all_actions', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'read', label: 'Read' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'manage', label: 'Manage' },
];

export const PERMISSION_SCOPE_OPTIONS = [
  { value: 'all_scopes', label: 'All Scopes' },
  { value: 'all', label: 'All' },
  { value: 'own', label: 'Own' },
  { value: 'department', label: 'Department' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'custom', label: 'Custom' },
];

import type { FilterTab } from '@/components/shared';

export const BRAND_STATUS_TABS: FilterTab<string>[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
];

export const BRAND_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

export const BRAND_STATUS_VARIANTS = {
  active: 'success',
  inactive: 'secondary',
} as const;

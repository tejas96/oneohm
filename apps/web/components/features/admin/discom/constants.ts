import type { CrmTone } from '@/components/shared/crm-table';

export const DISCOM_STATUS_TONE: Record<'active' | 'inactive', CrmTone> = {
  active: 'success',
  inactive: 'neutral',
};

export const DISCOM_SORT_FIELD_MAP: Record<string, string> = {
  hierarchy: 'divisionName',
  circle: 'circleName',
  status: 'isActive',
  updatedAt: 'updatedAt',
};

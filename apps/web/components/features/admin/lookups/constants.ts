import { LookupDataType, LookupScopeType } from '@tejas96/shared/types';

import type { FilterTab } from '@/components/shared';

export const LOOKUP_SCOPE_TYPE_LABELS: Record<LookupScopeType, string> = {
  [LookupScopeType.GLOBAL]: 'Global',
  [LookupScopeType.ORGANIZATION]: 'Organization',
};

export const LOOKUP_DATA_TYPE_LABELS: Record<LookupDataType, string> = {
  [LookupDataType.STRING]: 'String',
  [LookupDataType.NUMBER]: 'Number',
  [LookupDataType.BOOLEAN]: 'Boolean',
  [LookupDataType.DATE]: 'Date',
  [LookupDataType.JSON]: 'JSON',
};

export const LOOKUP_STATUS_TABS: FilterTab<string>[] = [
  { id: 'all', label: 'All' },
  { id: 'true', label: 'Active' },
  { id: 'false', label: 'Inactive' },
];

export const LOOKUP_SCOPE_TYPE_TABS: FilterTab<string>[] = [
  { id: 'all', label: 'All' },
  { id: LookupScopeType.GLOBAL, label: 'Global' },
  { id: LookupScopeType.ORGANIZATION, label: 'Organization' },
];

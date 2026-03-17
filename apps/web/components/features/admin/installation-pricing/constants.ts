import type { FilterTab } from '@/components/shared';

export const TIER_STATUS_TABS: FilterTab<string>[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
];

export const COST_COMPONENT_FIELDS = [
  { key: 'electrical_work', label: 'Electrical Work' },
  { key: 'fixed_material', label: 'Fixed Material' },
  { key: 'structure_cost', label: 'Structure Cost' },
  { key: 'installation_labor', label: 'Installation Labor' },
  { key: 'loading_unloading', label: 'Loading & Unloading' },
  { key: 'msedcl_charges', label: 'MSEDCL Charges' },
  { key: 'supervision', label: 'Supervision' },
  { key: 'variable_floor', label: 'Variable Floor Base' },
  { key: 'profitability_percent', label: 'Profitability %' },
] as const;

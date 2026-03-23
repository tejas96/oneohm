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
] as const;

export const DEFAULT_COST_COMPONENT_SEED = COST_COMPONENT_FIELDS;

export function getDefaultCostComponentsRecord(): Record<string, number> {
  return Object.fromEntries(DEFAULT_COST_COMPONENT_SEED.map(({ key }) => [key, 0])) as Record<
    string,
    number
  >;
}

export function labelForCostComponentKey(key: string): string {
  const found = DEFAULT_COST_COMPONENT_SEED.find((e) => e.key === key);
  if (found) return found.label;
  return key
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

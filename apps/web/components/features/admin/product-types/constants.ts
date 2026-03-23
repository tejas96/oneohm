import { UnitOfMeasure } from '@oneohm-epc/shared/types';

import type { FilterTab } from '@/components/shared';

export const PRODUCT_TYPE_STATUS_TABS: FilterTab<string>[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
];

export const PRICING_BASIS_OPTIONS = [
  { value: 'per_unit', label: 'Per Unit' },
  { value: 'per_watt', label: 'Per Watt' },
  { value: 'per_kw', label: 'Per kW' },
];

export const UNIT_OF_MEASURE_OPTIONS = [
  { value: UnitOfMeasure.PIECES, label: 'Pieces' },
  { value: UnitOfMeasure.METERS, label: 'Meters' },
  { value: UnitOfMeasure.KILOGRAMS, label: 'Kilograms' },
  { value: UnitOfMeasure.SETS, label: 'Sets' },
  { value: UnitOfMeasure.BOXES, label: 'Boxes' },
  { value: UnitOfMeasure.ROLLS, label: 'Rolls' },
];

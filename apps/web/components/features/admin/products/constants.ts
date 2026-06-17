import { ProductStatus } from '@tejas96/shared/types';

import type { FilterTab } from '@/components/shared';

export const PRODUCT_STATUS_TABS: FilterTab<string>[] = [
  { id: 'all', label: 'All' },
  { id: ProductStatus.ACTIVE, label: 'Active' },
  { id: ProductStatus.INACTIVE, label: 'Inactive' },
  { id: ProductStatus.DISCONTINUED, label: 'Discontinued' },
];

export const PRODUCT_STATUS_VARIANTS: Record<ProductStatus, 'success' | 'secondary' | 'warning'> = {
  [ProductStatus.ACTIVE]: 'success',
  [ProductStatus.INACTIVE]: 'secondary',
  [ProductStatus.DISCONTINUED]: 'warning',
};

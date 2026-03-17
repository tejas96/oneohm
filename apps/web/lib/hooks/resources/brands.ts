'use client';

import {
  type BaseFilters,
  defineResource,
  getResourceConfig,
  getResourcePermissions,
  STALE_TIMES,
  useResourceList,
  useResourceMutations,
  useResourcePermissions,
  type ResourceConfig,
} from '../core';

export interface Brand {
  id: string;
  organizationId: string;
  name: string;
  manufacturerName?: string;
  logoUrl?: string;
  website?: string;
  supportContact?: string;
  description?: string;
  isActive: boolean;
  productTypeIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BrandFilters extends BaseFilters {
  productTypeId?: string;
  isActive?: boolean;
}

defineResource<Brand>(
  'brands',
  {
    endpoint: '/brands',
    defaultPageSize: 20,
    searchDebounceMs: 500,
    syncToUrl: true,
    staleTime: STALE_TIMES.slow,
    defaultSort: { field: 'name', order: 'ASC' },
  },
  {
    view: 'brands:read',
    create: 'brands:create',
    update: 'brands:update',
    delete: 'brands:delete',
  },
);

export function useBrandList(
  overrides?: Partial<ResourceConfig<Brand, BrandFilters>>,
): ReturnType<typeof useResourceList<Brand, BrandFilters>> {
  const config = getResourceConfig('brands') as ResourceConfig<Brand, BrandFilters>;
  return useResourceList<Brand, BrandFilters>({
    ...config,
    ...overrides,
    defaultFilters: {
      ...config.defaultFilters,
      ...overrides?.defaultFilters,
    } as Partial<BrandFilters>,
  });
}

export function useBrandMutations() {
  return useResourceMutations<Brand>({
    resource: 'brands',
    endpoint: '/brands',
    toast: {
      create: { success: 'Brand created', error: 'Failed to create brand' },
      update: { success: 'Brand updated', error: 'Failed to update brand' },
      delete: { success: 'Brand deleted', error: 'Failed to delete brand' },
    },
  });
}

export function useBrandPermissions() {
  return useResourcePermissions(getResourcePermissions('brands'));
}

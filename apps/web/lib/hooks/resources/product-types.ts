'use client';

import {
  type BaseFilters,
  defineResource,
  getResourceConfig,
  getResourcePermissions,
  STALE_TIMES,
  useResourceList,
  useResourceDetail,
  useResourceMutations,
  useResourcePermissions,
  type ResourceConfig,
} from '../core';

export interface ProductTypeAttribute {
  id?: string;
  productTypeId?: string;
  attributeKey: string;
  label: string;
  dataType: string;
  isRequired: boolean;
  isFilterable: boolean;
  validation?: Record<string, unknown>;
  defaultValue?: string;
  groupName: string;
  sortOrder: number;
  helpText?: string;
  isSystem?: boolean;
}

export interface ProductType {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  defaultUnitOfMeasure: string;
  defaultPricingBasis: string;
  defaultGstRate: number;
  isActive: boolean;
  isSystem?: boolean;
  sortOrder: number;
  attributes?: ProductTypeAttribute[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductTypeFilters extends BaseFilters {
  isActive?: boolean;
}

defineResource<ProductType>(
  'product-types',
  {
    endpoint: '/product-types',
    defaultPageSize: 20,
    searchDebounceMs: 500,
    syncToUrl: true,
    staleTime: STALE_TIMES.slow,
    defaultSort: { field: 'sortOrder', order: 'ASC' },
  },
  {
    view: 'product-types:read',
    create: 'product-types:create',
    update: 'product-types:update',
  },
);

export function useProductTypeList(
  overrides?: Partial<ResourceConfig<ProductType, ProductTypeFilters>>,
): ReturnType<typeof useResourceList<ProductType, ProductTypeFilters>> {
  const config = getResourceConfig('product-types') as ResourceConfig<
    ProductType,
    ProductTypeFilters
  >;
  return useResourceList<ProductType, ProductTypeFilters>({
    ...config,
    ...overrides,
    defaultFilters: {
      ...config.defaultFilters,
      ...overrides?.defaultFilters,
    } as Partial<ProductTypeFilters>,
  });
}

export function useProductTypeMutations() {
  return useResourceMutations<ProductType>({
    resource: 'product-types',
    endpoint: '/product-types',
    toast: {
      create: { success: 'Product type created', error: 'Failed to create product type' },
      update: { success: 'Product type updated', error: 'Failed to update product type' },
    },
  });
}

export function useProductType(productTypeId: string) {
  return useResourceDetail<ProductType>({
    resource: 'product-types',
    endpoint: '/product-types',
    id: productTypeId,
  });
}

export function useProductTypePermissions() {
  return useResourcePermissions(getResourcePermissions('product-types'));
}

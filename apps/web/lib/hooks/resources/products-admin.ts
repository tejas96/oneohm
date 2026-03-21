'use client';

import { ProductStatus, type ProductSpecifications, UnitOfMeasure } from '@oneohm-epc/shared/types';

import {
  type BaseFilters,
  defineResource,
  getResourceConfig,
  getResourcePermissions,
  useResourceList,
  useResourceMutations,
  useResourcePermissions,
  type ResourceConfig,
} from '../core';

export interface ProductAdminItem {
  id: string;
  organizationId: string;
  productTypeId: string;
  brandId: string;
  brand?: { id: string; name: string };
  name: string;
  code: string;
  description?: string;
  modelNumber?: string;
  specifications: ProductSpecifications;
  unitOfMeasure: UnitOfMeasure;
  productWarrantyYears?: number;
  performanceWarrantyYears?: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProductAdminFilters extends BaseFilters {
  status?: ProductStatus | 'all';
  productTypeId?: string;
  brandId?: string;
  search?: string;
}

defineResource<ProductAdminItem>(
  'products-admin',
  {
    endpoint: '/products',
    defaultPageSize: 20,
    searchDebounceMs: 500,
    syncToUrl: true,
    defaultSort: { field: 'createdAt', order: 'DESC' },
    defaultFilters: { status: ProductStatus.ACTIVE } as Partial<ProductAdminFilters>,
  },
  {
    view: 'products:read',
    create: 'products:create',
    update: 'products:update',
    delete: 'products:delete',
  },
);

export function useProductsAdmin() {
  const config = getResourceConfig('products-admin') as ResourceConfig<
    ProductAdminItem,
    ProductAdminFilters
  >;
  return useResourceList<ProductAdminItem, ProductAdminFilters>(config);
}

export function useProductAdminMutations() {
  return useResourceMutations<ProductAdminItem>({
    resource: 'products-admin',
    endpoint: '/products',
    toast: {
      create: { success: 'Product created', error: 'Failed to create product' },
      update: { success: 'Product updated', error: 'Failed to update product' },
      delete: { success: 'Product deleted', error: 'Failed to delete product' },
      statusChange: { success: 'Product status updated', error: 'Failed to update status' },
    },
    customActions: {
      status: {
        method: 'POST',
        path: (id) => `/products/${id}/status`,
      },
    },
  });
}

export function useProductAdminPermissions() {
  return useResourcePermissions(getResourcePermissions('products-admin'));
}

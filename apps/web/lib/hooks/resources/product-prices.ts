'use client';

import { ProjectType } from '@tejas96/shared/types';

import { defineResource, useResourceMutations, useResourceSubList } from '../core';

export interface ProductPrice {
  id: string;
  organizationId: string;
  productId: string;
  projectType?: ProjectType | null;
  unitPrice: number;
  costMultiplier: number;
  gstRate: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

defineResource<ProductPrice>(
  'product-prices',
  {
    endpoint: '/products/{parentId}/prices',
    syncToUrl: false,
  },
  {
    view: 'products:read',
    create: 'products:create',
    update: 'products:update',
    delete: 'products:delete',
  },
  {
    view: 'admin.catalog.manage',
    create: 'admin.catalog.manage',
    update: 'admin.catalog.manage',
    delete: 'admin.catalog.manage',
  },
);

export function useProductPrices(productId: string) {
  return useResourceSubList<ProductPrice>(
    {
      resource: 'product-prices',
      endpoint: '/products/{parentId}/prices',
      parentResource: 'products',
      parentIdInPath: true,
    },
    productId,
  );
}

export function useProductPriceMutations(productId: string) {
  return useResourceMutations<ProductPrice>({
    resource: 'product-prices',
    endpoint: `/products/${productId}/prices`,
    invalidateRelated: [
      'products-admin',
      'products-panels',
      'products-inverters',
      'products-structures',
    ],
    toast: {
      create: { success: 'Price added', error: 'Failed to add price' },
      update: { success: 'Price updated', error: 'Failed to update price' },
      delete: { success: 'Price deactivated', error: 'Failed to deactivate price' },
    },
    customActions: {
      deactivate: {
        method: 'PATCH',
        path: (id) => `/products/${productId}/prices/${id}/deactivate`,
      },
    },
  });
}

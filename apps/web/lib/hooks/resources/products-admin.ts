'use client';

import { ProductStatus, type ProductSpecifications, UnitOfMeasure } from '@oneohm-epc/shared/types';
import { useQuery } from '@tanstack/react-query';

import {
  type BaseFilters,
  createResourceKeys,
  defineResource,
  getResourceConfig,
  getResourcePermissions,
  STALE_TIMES,
  useOrgContext,
  useResourceList,
  useResourceMutations,
  useResourcePermissions,
  type ResourceConfig,
} from '../core';

import { apiClient } from '@/lib/api/client';

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

// ============================================================================
// Product Prices (read-only helper)
// ============================================================================

export interface ProductPrice {
  id: string;
  productId: string;
  projectType?: string | null;
  unitPrice: number;
  costMultiplier: number;
  gstRate: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
}

const productPriceKeys = createResourceKeys('product-prices');

/**
 * Fetches active price rows for a product.
 * Used by the PO create form to auto-fill `unitPrice` and `taxRate` when
 * the user selects a product. Cache-stable so repeated picks are instant.
 */
export function useProductPrices(
  productId: string | undefined,
  options?: { enabled?: boolean },
): {
  data: ProductPrice[] | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const { orgHeaders, organizationId, isReady } = useOrgContext();

  const query = useQuery<ProductPrice[]>({
    queryKey: productPriceKeys.list(organizationId, { productId, isActive: true }),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<ProductPrice[]>(
        `/products/${productId}/prices?isActive=true`,
        { headers: orgHeaders, signal },
      );
      return data;
    },
    enabled: Boolean(productId) && isReady && (options?.enabled ?? true),
    staleTime: STALE_TIMES.standard,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

/**
 * Picks the "best" active price for the given product.
 * Strategy: prefer the row with no projectType (default/general), else
 * take the row with the latest effectiveFrom that is on/before today.
 * Returns null when no usable price exists.
 */
export function pickBestProductPrice(prices: ProductPrice[] | undefined): ProductPrice | null {
  if (!prices || prices.length === 0) return null;
  const today = new Date();
  const inWindow = (p: ProductPrice): boolean => {
    const from = new Date(p.effectiveFrom);
    if (Number.isNaN(from.getTime())) return false;
    if (from > today) return false;
    if (p.effectiveTo) {
      const to = new Date(p.effectiveTo);
      if (!Number.isNaN(to.getTime()) && to < today) return false;
    }
    return p.isActive;
  };
  const usable = prices.filter(inWindow);
  if (usable.length === 0) return null;
  const generic = usable.filter((p) => !p.projectType);
  const pool = generic.length > 0 ? generic : usable;
  return pool.reduce((latest, p) =>
    new Date(p.effectiveFrom) > new Date(latest.effectiveFrom) ? p : latest,
  );
}

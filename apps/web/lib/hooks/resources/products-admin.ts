'use client';

import { useQuery } from '@tanstack/react-query';
import { ProductStatus, type ProductSpecifications, UnitOfMeasure } from '@tejas96/shared/types';

import {
  type BaseFilters,
  defineResource,
  getResourceConfig,
  STALE_TIMES,
  useResourceList,
  useResourceMutations,
  type ResourceConfig,
} from '../core';

import { apiClient } from '@/lib/api/client';

export interface ProductAdminItem {
  id: string;
  productTypeId: string;
  brandId: string;
  brand?: { id: string; name: string };
  name: string;
  code: string;
  description?: string | null;
  modelNumber?: string | null;
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
  // No permission codes. Admin screens are gated as a whole by
  // SUPERADMIN_ONLY in route-map.ts, so a per-resource code would
  // gate nothing extra.
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
    invalidateRelated: ['products-structures', 'products-structures-admin'],
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

// ============================================================================
// Product Prices (read-only helper)
// ============================================================================

// ============================================================================
// Effective Unit Price (canonical ₹-per-piece resolver)
// ============================================================================

/**
 * Response shape from `GET /products/:id/effective-price`. Mirrors backend
 * EffectiveUnitPriceResponseDto. `unitPricePerPiece` is null when no active
 * price exists for the product OR when required conversion input is missing
 * (e.g. per_watt panel with no wattage in specs) -- consumers should fall
 * back to manual entry in that case rather than treat null as an error.
 */
export interface EffectiveProductPrice {
  productId: string;
  unitPricePerPiece: number | null;
  basePrice: number | null;
  costMultiplier: number | null;
  gstRate?: number;
  currency: string;
  basis: string;
  source: 'product_prices' | 'none';
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  wattage?: number | null;
  systemSizeKw?: number | null;
}

export interface UseEffectiveProductPriceOptions {
  projectType?: string;
  /** ISO date string (e.g. PO date). Defaults to today on the backend. */
  asOf?: string;
  systemSizeKw?: number;
  enabled?: boolean;
}

/**
 * Fetches the canonical per-piece price for a product. Used by the PO create
 * form so the suggested unit_price matches what the quote calculator and BOM
 * use for the same product. Returns `null` data (not an error) when the
 * catalog has no usable price -- the form falls back to manual entry then.
 *
 * Cache key includes projectType + asOf + systemSizeKw so different contexts
 * (e.g. residential vs commercial PO, today vs historical) don't collide.
 */
export function useEffectiveProductPrice(
  productId: string | undefined,
  options: UseEffectiveProductPriceOptions = {},
): {
  data: EffectiveProductPrice | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const { projectType, asOf, systemSizeKw, enabled } = options;

  const query = useQuery<EffectiveProductPrice>({
    queryKey: [
      'product-prices',
      'effective-price',
      productId,
      { projectType: projectType ?? null, asOf: asOf ?? null, systemSizeKw: systemSizeKw ?? null },
    ],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (projectType) params.set('projectType', projectType);
      if (asOf) params.set('asOf', asOf);
      if (systemSizeKw != null) params.set('systemSizeKw', String(systemSizeKw));
      const qs = params.toString();
      const { data } = await apiClient.get<EffectiveProductPrice>(
        `/products/${productId}/effective-price${qs ? `?${qs}` : ''}`,
        { signal },
      );
      return data;
    },
    enabled: Boolean(productId) && (enabled ?? true),
    staleTime: STALE_TIMES.standard,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

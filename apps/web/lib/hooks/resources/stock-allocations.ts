'use client';

import {
  createResourceKeys,
  defineResource,
  useResourceDetail,
  useResourceList,
  useResourceMutations,
  useResourceStats,
  type BaseFilters,
  type ResourceConfig,
} from '../core';

// ============================================================================
// Types
// ============================================================================

export interface StockAllocation {
  id: string;
  organizationId: string;
  projectId: string;
  warehouseId: string;
  productId: string;
  allocatedQuantity: number;
  dispatchedQuantity: number;
  returnedQuantity: number;
  status: string;
  sourceType: string;
  notes?: string;
  project?: { id: string; name: string; projectNumber: string };
  warehouse?: { id: string; name: string; code?: string };
  product?: { id: string; name: string; code: string; unit?: string };
  /** Allocated/dispatched timeline. Backend exposes both — we use them for
   * the activity timeline on the detail page. */
  allocatedAt?: string;
  dispatchedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockAllocationFilters extends BaseFilters {
  status?: string;
  projectId?: string;
  warehouseId?: string;
  productId?: string;
}

export interface ReturnStockPayload {
  quantity: number;
  reason: string;
}

// ============================================================================
// Registry
// ============================================================================

defineResource<StockAllocation>(
  'stock-allocations',
  {
    endpoint: '/stock-allocations',
    defaultPageSize: 20,
    syncToUrl: true,
    defaultSort: { field: 'createdAt', order: 'DESC' },
  },
  {
    view: 'inventory:read',
    create: 'allocation:write',
    update: 'allocation:write',
    delete: 'allocation:write',
  },
);

// ============================================================================
// Query keys
// ============================================================================

export const stockAllocationKeys = createResourceKeys('stock-allocations');

// ============================================================================
// Hooks
// ============================================================================

export function useStockAllocations(
  overrides?: Partial<ResourceConfig<StockAllocation, StockAllocationFilters>>,
  options?: { enabled?: boolean },
) {
  return useResourceList<StockAllocation, StockAllocationFilters>(
    {
      resource: 'stock-allocations',
      endpoint: '/stock-allocations',
      defaultPageSize: 20,
      syncToUrl: true,
      ...overrides,
    },
    options,
  );
}

export function useStockAllocation(id: string) {
  return useResourceDetail<StockAllocation>({
    resource: 'stock-allocations',
    endpoint: '/stock-allocations',
    id,
  });
}

export function useStockAllocationMutations() {
  return useResourceMutations<StockAllocation>({
    resource: 'stock-allocations',
    endpoint: '/stock-allocations',
    invalidateRelated: [
      'inventory-stock',
      'inventory-transactions',
      'material-dispatches',
    ] as const,
    customActions: {
      fulfill: {
        method: 'POST',
        path: (id) => `/stock-allocations/${id}/fulfill`,
      },
      cancel: {
        method: 'POST',
        path: (id) => `/stock-allocations/${id}/cancel`,
      },
      return: {
        method: 'POST',
        path: (id) => `/stock-allocations/${id}/return`,
      },
    },
    toast: {
      create: { success: 'Allocation created', error: 'Failed to create allocation' },
      update: { success: 'Allocation updated', error: 'Failed to update allocation' },
      fulfill: { success: 'Allocation fulfilled', error: 'Failed to fulfill allocation' },
      cancel: { success: 'Allocation cancelled', error: 'Failed to cancel allocation' },
      return: { success: 'Stock returned', error: 'Failed to return stock' },
    },
  });
}

export function useStockAllocationStats() {
  return useResourceStats({
    resource: 'stock-allocations',
    endpoint: '/stock-allocations/stats/summary',
  });
}

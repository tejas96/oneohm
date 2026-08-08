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

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  warehouseType: string;
  status: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseFilters extends BaseFilters {
  status?: string;
  warehouseType?: string;
}

// ============================================================================
// Registry
// ============================================================================

defineResource<Warehouse>(
  'warehouses',
  {
    endpoint: '/warehouses',
    defaultPageSize: 20,
    syncToUrl: true,
    defaultSort: { field: 'name', order: 'ASC' },
  },
  {
    view: 'inventory:read',
    create: 'inventory:write',
    update: 'inventory:write',
    delete: 'inventory:write',
  },
);

// ============================================================================
// Query keys
// ============================================================================

export const warehouseKeys = createResourceKeys('warehouses');

// ============================================================================
// Hooks
// ============================================================================

export function useWarehouses(overrides?: Partial<ResourceConfig<Warehouse, WarehouseFilters>>) {
  return useResourceList<Warehouse, WarehouseFilters>({
    resource: 'warehouses',
    endpoint: '/warehouses',
    defaultPageSize: 20,
    syncToUrl: true,
    ...overrides,
  });
}

export function useWarehouse(id: string) {
  return useResourceDetail<Warehouse>({
    resource: 'warehouses',
    endpoint: '/warehouses',
    id,
  });
}

export function useWarehouseMutations() {
  return useResourceMutations<Warehouse>({
    resource: 'warehouses',
    endpoint: '/warehouses',
    customActions: {
      changeStatus: {
        method: 'PATCH',
        path: (id) => `/warehouses/${id}/status`,
      },
    },
    toast: {
      create: { success: 'Warehouse created', error: 'Failed to create warehouse' },
      update: { success: 'Warehouse updated', error: 'Failed to update warehouse' },
      delete: { success: 'Warehouse deleted', error: 'Failed to delete warehouse' },
      changeStatus: { success: 'Status updated', error: 'Failed to update status' },
    },
  });
}

export function useWarehouseStats() {
  return useResourceStats({
    resource: 'warehouses',
    endpoint: '/warehouses/stats/summary',
  });
}

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

export interface MaterialDispatch {
  id: string;
  dispatchNumber: string;
  status: string;
  projectId?: string;
  warehouseId: string;
  dispatchDate?: string;
  deliveryDate?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  preparedBy?: string;
  deliveredBy?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  transportCompany?: string;
  notes?: string;
  receivedBy?: string;
  receiverSignature?: string;
  warehouse?: { id: string; name: string; code?: string };
  project?: { id: string; name: string; projectNumber?: string };
  items?: MaterialDispatchItem[];
  createdAt: string;
  updatedAt: string;
}

export interface MaterialDispatchItem {
  id: string;
  productId: string;
  /** API quantity field */
  quantity?: number;
  dispatchedQuantity?: number;
  receivedQuantity?: number;
  stockAllocationId?: string;
  product?: { id: string; name: string; code: string };
}

export interface MaterialDispatchFilters extends BaseFilters {
  status?: string;
  projectId?: string;
  warehouseId?: string;
  fromDate?: string;
  toDate?: string;
}

// ============================================================================
// Registry
// ============================================================================

defineResource<MaterialDispatch>(
  'material-dispatches',
  {
    endpoint: '/material-dispatches',
    defaultPageSize: 20,
    syncToUrl: true,
    defaultSort: { field: 'createdAt', order: 'DESC' },
  },
  {
    view: 'inventory:read',
    create: 'dispatch:write',
    update: 'dispatch:write',
    delete: 'dispatch:write',
  },
);

// ============================================================================
// Query keys
// ============================================================================

export const materialDispatchKeys = createResourceKeys('material-dispatches');

// ============================================================================
// Hooks
// ============================================================================

export function useMaterialDispatches(
  overrides?: Partial<ResourceConfig<MaterialDispatch, MaterialDispatchFilters>>,
) {
  return useResourceList<MaterialDispatch, MaterialDispatchFilters>({
    resource: 'material-dispatches',
    endpoint: '/material-dispatches',
    defaultPageSize: 20,
    syncToUrl: true,
    ...overrides,
  });
}

export function useMaterialDispatch(id: string) {
  return useResourceDetail<MaterialDispatch>({
    resource: 'material-dispatches',
    endpoint: '/material-dispatches',
    id,
  });
}

export function useMaterialDispatchMutations() {
  return useResourceMutations<MaterialDispatch>({
    resource: 'material-dispatches',
    endpoint: '/material-dispatches',
    invalidateRelated: ['inventory-stock', 'inventory-transactions', 'stock-allocations'] as const,
    customActions: {
      markDispatched: {
        method: 'POST',
        path: (id) => `/material-dispatches/${id}/mark-dispatched`,
      },
      markDelivered: {
        method: 'POST',
        path: (id) => `/material-dispatches/${id}/mark-delivered`,
      },
      cancel: {
        method: 'POST',
        path: (id) => `/material-dispatches/${id}/cancel`,
      },
    },
    toast: {
      create: { success: 'Dispatch created', error: 'Failed to create dispatch' },
      update: { success: 'Dispatch updated', error: 'Failed to update dispatch' },
      markDispatched: { success: 'Marked as dispatched', error: 'Failed to mark as dispatched' },
      markDelivered: { success: 'Marked as delivered', error: 'Failed to mark as delivered' },
      cancel: { success: 'Dispatch cancelled', error: 'Failed to cancel dispatch' },
    },
  });
}

export function useMaterialDispatchStats() {
  return useResourceStats({
    resource: 'material-dispatches',
    endpoint: '/material-dispatches/stats/summary',
  });
}

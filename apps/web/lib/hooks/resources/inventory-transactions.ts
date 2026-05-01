'use client';

import {
  createResourceKeys,
  defineResource,
  useResourceDetail,
  useResourceList,
  useResourceStats,
  type BaseFilters,
  type ResourceConfig,
} from '../core';

// ============================================================================
// Types
// ============================================================================

export interface InventoryTransaction {
  id: string;
  organizationId: string;
  transactionType: string;
  quantity: number;
  warehouseId: string;
  productId: string;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  transactionDate: string;
  fromWarehouseId?: string | null;
  toWarehouseId?: string | null;
  fromWarehouse?: { id: string; name: string; code?: string } | null;
  toWarehouse?: { id: string; name: string; code?: string } | null;
  batchNumber?: string | null;
  serialNumber?: string | null;
  warehouse?: { id: string; name: string; code?: string };
  product?: { id: string; name: string; code: string; unit?: string };
  creator?: { id: string; name: string };
  createdAt: string;
}

export interface InventoryTransactionFilters extends BaseFilters {
  transactionType?: string;
  warehouseId?: string;
  productId?: string;
  fromDate?: string;
  toDate?: string;
  referenceType?: string;
}

// ============================================================================
// Registry
// ============================================================================

defineResource<InventoryTransaction>(
  'inventory-transactions',
  {
    endpoint: '/inventory-transactions',
    defaultPageSize: 20,
    syncToUrl: true,
    defaultSort: { field: 'transactionDate', order: 'DESC' },
  },
  {
    view: 'inventory:read',
  },
);

// ============================================================================
// Query keys
// ============================================================================

export const inventoryTransactionKeys = createResourceKeys('inventory-transactions');

// ============================================================================
// Hooks
// ============================================================================

export function useInventoryTransactions(
  overrides?: Partial<ResourceConfig<InventoryTransaction, InventoryTransactionFilters>>,
  options?: { enabled?: boolean },
) {
  return useResourceList<InventoryTransaction, InventoryTransactionFilters>(
    {
      resource: 'inventory-transactions',
      endpoint: '/inventory-transactions',
      defaultPageSize: 20,
      syncToUrl: true,
      ...overrides,
    },
    options,
  );
}

export function useInventoryTransaction(id: string) {
  return useResourceDetail<InventoryTransaction>({
    resource: 'inventory-transactions',
    endpoint: '/inventory-transactions',
    id,
  });
}

export function useInventoryTransactionStats() {
  return useResourceStats({
    resource: 'inventory-transactions',
    endpoint: '/inventory-transactions/stats/summary',
  });
}

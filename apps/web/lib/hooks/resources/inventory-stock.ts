'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createResourceKeys,
  defineResource,
  useOrgContext,
  useResourceDetail,
  useResourceList,
  type BaseFilters,
  type ResourceConfig,
} from '../core';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils/error';

// ============================================================================
// Types
// ============================================================================

export interface InventoryStock {
  id: string;
  organizationId: string;
  warehouseId: string;
  productId: string;
  availableQuantity: number;
  reservedQuantity: number;
  inTransitQuantity: number;
  minimumStockLevel: number;
  maximumStockLevel?: number;
  product?: { id: string; name: string; code: string; unit?: string };
  warehouse?: { id: string; name: string; code: string };
  updatedAt: string;
}

export interface InventoryStockFilters extends BaseFilters {
  warehouseId?: string;
  productId?: string;
  lowStock?: boolean;
}

export interface AdjustStockPayload {
  warehouseId: string;
  productId: string;
  newQuantity: number;
  reason: string;
}

export interface TransferStockPayload {
  fromWarehouseId: string;
  toWarehouseId: string;
  productId: string;
  quantity: number;
  notes?: string;
}

// ============================================================================
// Registry
// ============================================================================

defineResource<InventoryStock>(
  'inventory-stock',
  {
    endpoint: '/inventory-stock',
    defaultPageSize: 20,
    syncToUrl: true,
    defaultSort: { field: 'product.name', order: 'ASC' },
  },
  {
    view: 'inventory:read',
  },
);

// ============================================================================
// Query keys
// ============================================================================

export const inventoryStockKeys = createResourceKeys('inventory-stock');

// ============================================================================
// Hooks
// ============================================================================

export function useInventoryStockList(
  overrides?: Partial<ResourceConfig<InventoryStock, InventoryStockFilters>>,
  options?: { enabled?: boolean },
) {
  return useResourceList<InventoryStock, InventoryStockFilters>(
    {
      resource: 'inventory-stock',
      endpoint: '/inventory-stock',
      defaultPageSize: 20,
      syncToUrl: true,
      ...overrides,
    },
    options,
  );
}

export function useInventoryStockDetail(id: string) {
  return useResourceDetail<InventoryStock>({
    resource: 'inventory-stock',
    endpoint: '/inventory-stock',
    id,
  });
}

export function useAdjustInventoryStock() {
  const queryClient = useQueryClient();
  const { orgHeaders } = useOrgContext();
  const mutation = useMutation<InventoryStock, unknown, AdjustStockPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<InventoryStock>('/inventory-stock/adjust', payload, {
        headers: orgHeaders,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
    },
    onError: (err) => {
      showToast.error(getErrorMessage(err));
    },
  });

  return {
    ...mutation,
    execute: (payload: AdjustStockPayload) => mutation.mutateAsync(payload),
  };
}

export function useTransferInventoryStock() {
  const queryClient = useQueryClient();
  const { orgHeaders } = useOrgContext();
  const mutation = useMutation<void, unknown, TransferStockPayload>({
    mutationFn: async (payload) => {
      await apiClient.post('/inventory-stock/transfer', payload, { headers: orgHeaders });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
    },
    onError: (err) => {
      showToast.error(getErrorMessage(err));
    },
  });

  return {
    ...mutation,
    execute: (payload: TransferStockPayload) => mutation.mutateAsync(payload),
  };
}

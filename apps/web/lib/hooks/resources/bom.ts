'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createResourceKeys, defineResource, useOrgContext } from '../core';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils/error';

// ============================================================================
// Types
// ============================================================================

export interface BomItem {
  id: string;
  itemType: 'panel' | 'inverter' | 'structure';
  productId?: string;
  name: string;
  brand?: string;
  specifications: Record<string, unknown>;
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalPrice?: number;
  gstRate?: number;
  gstAmount?: number;
  warrantyYears?: number;
  sortOrder: number;
}

export interface Bom {
  id: string;
  bomNumber: string;
  entityType: string;
  entityId: string;
  status: string;
  totalItems: number;
  totalCost: number;
  items: BomItem[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Registry
// ============================================================================

defineResource<Bom>(
  'bom',
  {
    endpoint: '/bom',
    defaultPageSize: 10,
    syncToUrl: false,
    defaultSort: { field: 'createdAt', order: 'DESC' },
  },
  {
    view: 'quotes:read',
  },
);

export const bomResourceKeys = createResourceKeys('bom');

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch the BOM for a specific entity (e.g. a quote version).
 * BOMs are immutable snapshots so we use a longer staleTime.
 */
export function useEntityBom(entityType: string, entityId: string | undefined) {
  const { organizationId, orgHeaders, isReady } = useOrgContext();

  return useQuery({
    queryKey: [...bomResourceKeys.all(organizationId), entityType, entityId] as const,
    queryFn: async ({ signal }): Promise<Bom | null> => {
      const { data } = await apiClient.get<Bom | null>(
        `/bom?entityType=${entityType}&entityId=${entityId}`,
        { headers: orgHeaders, signal },
      );
      return data;
    },
    enabled: isReady && !!entityId,
    staleTime: 60_000,
  });
}

export function useFinalizeBomAndAllocate() {
  const queryClient = useQueryClient();
  const { orgHeaders } = useOrgContext();
  const mutation = useMutation<
    { allocations: unknown[] },
    unknown,
    { bomId: string; warehouseId: string }
  >({
    mutationFn: async ({ bomId, warehouseId }) => {
      const { data } = await apiClient.post<{ allocations: unknown[] }>(
        `/bom/${bomId}/finalize-and-allocate`,
        { warehouseId },
        { headers: orgHeaders },
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stock-allocations'] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['bom'] });
      showToast.success('BOM finalized and stock allocated');
    },
    onError: (err) => {
      showToast.error(getErrorMessage(err));
    },
  });

  return {
    ...mutation,
    execute: (bomId: string, warehouseId: string) => mutation.mutateAsync({ bomId, warehouseId }),
  };
}

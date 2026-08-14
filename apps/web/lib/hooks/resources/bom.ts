'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Bom, BomItem } from '@tejas96/shared/types';

import { createResourceKeys, defineResource } from '../core';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils/error';

export type { Bom, BomItem };

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
    view: 'quotes.view',
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
  return useQuery({
    queryKey: [...bomResourceKeys.all(), entityType, entityId] as const,
    queryFn: async ({ signal }): Promise<Bom | null> => {
      const { data } = await apiClient.get<Bom | null>(
        `/bom?entityType=${entityType}&entityId=${entityId}`,
        { signal },
      );
      if (!data) return null;

      const lineGroups = new Set<string>();
      for (const item of data.items ?? []) {
        const groupId = item.groupKey || `row:${item.id}`;
        lineGroups.add(groupId);
      }

      return {
        ...data,
        totalUnits: data.totalItems,
        totalLineItems: lineGroups.size,
      };
    },
    enabled: !!entityId,
    staleTime: 60_000,
  });
}

export interface AllocateBomPendingResult {
  allocated: Array<{ productId: string; name: string; reserved: number }>;
  pendingStock: Array<{ productId: string; name: string; shortfall: number }>;
  alreadySatisfied: Array<{ productId: string; name: string }>;
}

/**
 * Reserve stock for pending BOM lines.
 * Warehouse is read from project.defaultWarehouseId — no dialog needed.
 * Partial allocation is normal: items not fully covered appear in pendingStock.
 */
export function useAllocateBomPending() {
  const queryClient = useQueryClient();

  const mutation = useMutation<AllocateBomPendingResult, unknown, string>({
    mutationFn: async (bomId: string) => {
      const { data } = await apiClient.post<AllocateBomPendingResult>(
        `/bom/${bomId}/allocate-pending`,
        {},
      );
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['stock-allocations'] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['bom'] });

      if (data.pendingStock.length === 0) {
        showToast.success('Stock reserved successfully');
      } else {
        showToast.warning(
          `Stock partially reserved. ${data.pendingStock.length} item(s) still pending.`,
        );
      }
    },
    onError: (err) => {
      showToast.error(getErrorMessage(err));
    },
  });

  return {
    ...mutation,
    execute: (bomId: string) => mutation.mutateAsync(bomId),
  };
}

export interface UpdateBomItemSerialPayload {
  itemId: string;
  serialNumber: string | null;
}

export interface BulkUpdateBomItemSerialsPayload {
  items: Array<{ id: string; serialNumber: string | null }>;
}

export interface BomSerialConflict {
  bomId: string;
  bomNumber: string;
  entityType: string;
  entityId: string;
  itemId: string;
  itemType: string;
  itemName: string;
}

interface BomMutationContext {
  snapshots: Array<[readonly unknown[], Bom | null | undefined]>;
}

export function useUpdateBomItemSerial() {
  const queryClient = useQueryClient();

  const mutation = useMutation<BomItem, unknown, UpdateBomItemSerialPayload, BomMutationContext>({
    mutationFn: async ({ itemId, serialNumber }) => {
      const { data } = await apiClient.patch<{ data: BomItem }>(`/bom-items/${itemId}/serial`, {
        serialNumber,
      });
      return data.data;
    },
    onMutate: async ({ itemId, serialNumber }) => {
      const targetKeyPrefix = bomResourceKeys.all();
      await queryClient.cancelQueries({ queryKey: targetKeyPrefix });

      const snapshots = queryClient.getQueriesData<Bom | null>({ queryKey: targetKeyPrefix });
      for (const [queryKey, cachedBom] of snapshots) {
        if (!cachedBom) continue;
        const updatedItems = cachedBom.items.map((item) =>
          item.id === itemId ? { ...item, serialNumber: serialNumber ?? undefined } : item,
        );
        queryClient.setQueryData<Bom>(queryKey, { ...cachedBom, items: updatedItems });
      }

      return { snapshots };
    },
    onSuccess: (updatedItem) => {
      const targetKeyPrefix = bomResourceKeys.all();
      const snapshots = queryClient.getQueriesData<Bom | null>({ queryKey: targetKeyPrefix });
      for (const [queryKey, cachedBom] of snapshots) {
        if (!cachedBom) continue;
        const updatedItems = cachedBom.items.map((item) =>
          item.id === updatedItem.id ? { ...item, ...updatedItem } : item,
        );
        queryClient.setQueryData<Bom>(queryKey, { ...cachedBom, items: updatedItems });
      }
      void queryClient.invalidateQueries({ queryKey: ['bom'] });
    },
    onError: (err, _variables, context) => {
      if (context?.snapshots) {
        for (const [queryKey, cachedBom] of context.snapshots) {
          queryClient.setQueryData<Bom | null>(queryKey, cachedBom ?? null);
        }
      }
      // 404 means the BOM item was deleted by a concurrent reconcile (e.g. qty reduction).
      // Refetch silently and surface a gentle notice rather than a hard error.
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        void queryClient.invalidateQueries({ queryKey: ['bom'] });
        showToast.warning('This unit was removed from the BOM; serial discarded.');
      } else {
        showToast.error(getErrorMessage(err));
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['bom'] });
    },
  });

  return {
    ...mutation,
    execute: (payload: UpdateBomItemSerialPayload) => mutation.mutateAsync(payload),
  };
}

export function useBulkUpdateBomItemSerials() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    BomItem[],
    unknown,
    BulkUpdateBomItemSerialsPayload,
    BomMutationContext
  >({
    mutationFn: async ({ items }) => {
      const { data } = await apiClient.patch<{ data: BomItem[] }>('/bom-items/bulk-serials', {
        items,
      });
      return data.data;
    },
    onMutate: async ({ items }) => {
      const targetKeyPrefix = bomResourceKeys.all();
      await queryClient.cancelQueries({ queryKey: targetKeyPrefix });

      const updatesById = new Map(items.map((item) => [item.id, item.serialNumber ?? undefined]));
      const snapshots = queryClient.getQueriesData<Bom | null>({ queryKey: targetKeyPrefix });
      for (const [queryKey, cachedBom] of snapshots) {
        if (!cachedBom) continue;
        const updatedItems = cachedBom.items.map((item) =>
          updatesById.has(item.id) ? { ...item, serialNumber: updatesById.get(item.id) } : item,
        );
        queryClient.setQueryData<Bom>(queryKey, { ...cachedBom, items: updatedItems });
      }

      return { snapshots };
    },
    onSuccess: (updatedItems) => {
      const updatesById = new Map(updatedItems.map((item) => [item.id, item]));
      const targetKeyPrefix = bomResourceKeys.all();
      const snapshots = queryClient.getQueriesData<Bom | null>({ queryKey: targetKeyPrefix });
      for (const [queryKey, cachedBom] of snapshots) {
        if (!cachedBom) continue;
        const mergedItems = cachedBom.items.map((item) => {
          const updatedItem = updatesById.get(item.id);
          return updatedItem ? { ...item, ...updatedItem } : item;
        });
        queryClient.setQueryData<Bom>(queryKey, { ...cachedBom, items: mergedItems });
      }
      void queryClient.invalidateQueries({ queryKey: ['bom'] });
    },
    onError: (err, _variables, context) => {
      if (context?.snapshots) {
        for (const [queryKey, cachedBom] of context.snapshots) {
          queryClient.setQueryData<Bom | null>(queryKey, cachedBom ?? null);
        }
      }
      showToast.error(getErrorMessage(err));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['bom'] });
    },
  });

  return {
    ...mutation,
    execute: (payload: BulkUpdateBomItemSerialsPayload) => mutation.mutateAsync(payload),
  };
}

/**
 * Force-resync BOM from quote snapshot (admin/emergency path only).
 * Not exposed in the main UI — kept for ops/admin use via direct API or admin panel.
 */
export function useSyncProjectBom(projectId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation<{ message: string }, unknown>({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ message: string }>(
        `/projects/${projectId}/sync-bom`,
        {},
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...bomResourceKeys.all(), 'project', projectId],
      });
      void queryClient.invalidateQueries({ queryKey: ['bom'] });
      showToast.success('BOM resynced from quote');
    },
    onError: (err) => {
      showToast.error(getErrorMessage(err));
    },
  });

  return {
    ...mutation,
    execute: () => mutation.mutateAsync(),
  };
}

export function useBomSerialConflicts(serialNumber: string | undefined) {
  const normalizedSerial = serialNumber?.trim() ?? '';

  return useQuery({
    queryKey: [...bomResourceKeys.all(), 'serial-conflicts', normalizedSerial] as const,
    queryFn: async ({ signal }): Promise<BomSerialConflict[]> => {
      const { data } = await apiClient.get<{ data: BomSerialConflict[] }>(
        `/bom-items/check-serial?serialNumber=${encodeURIComponent(normalizedSerial)}`,
        { signal },
      );
      return data.data ?? [];
    },
    enabled: normalizedSerial.length > 0,
    staleTime: 15_000,
  });
}

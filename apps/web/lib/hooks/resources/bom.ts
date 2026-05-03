'use client';

import type { Bom, BomItem } from '@oneohm-epc/shared/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createResourceKeys, defineResource, useOrgContext } from '../core';

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
  const { orgHeaders, organizationId } = useOrgContext();

  const mutation = useMutation<BomItem, unknown, UpdateBomItemSerialPayload, BomMutationContext>({
    mutationFn: async ({ itemId, serialNumber }) => {
      const { data } = await apiClient.patch<{ data: BomItem }>(
        `/bom-items/${itemId}/serial`,
        { serialNumber },
        { headers: orgHeaders },
      );
      return data.data;
    },
    onMutate: async ({ itemId, serialNumber }) => {
      const targetKeyPrefix = bomResourceKeys.all(organizationId);
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
      const targetKeyPrefix = bomResourceKeys.all(organizationId);
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
      showToast.error(getErrorMessage(err));
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
  const { orgHeaders, organizationId } = useOrgContext();

  const mutation = useMutation<
    BomItem[],
    unknown,
    BulkUpdateBomItemSerialsPayload,
    BomMutationContext
  >({
    mutationFn: async ({ items }) => {
      const { data } = await apiClient.patch<{ data: BomItem[] }>(
        '/bom-items/bulk-serials',
        { items },
        { headers: orgHeaders },
      );
      return data.data;
    },
    onMutate: async ({ items }) => {
      const targetKeyPrefix = bomResourceKeys.all(organizationId);
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
      const targetKeyPrefix = bomResourceKeys.all(organizationId);
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

export function useSyncProjectBom(projectId: string) {
  const queryClient = useQueryClient();
  const { orgHeaders, organizationId } = useOrgContext();

  const mutation = useMutation<{ message: string }, unknown>({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ message: string }>(
        `/projects/${projectId}/sync-bom`,
        {},
        { headers: orgHeaders },
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...bomResourceKeys.all(organizationId), 'project', projectId],
      });
      void queryClient.invalidateQueries({ queryKey: ['bom'] });
      showToast.success('BOM synced successfully');
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
  const { organizationId, orgHeaders, isReady } = useOrgContext();
  const normalizedSerial = serialNumber?.trim() ?? '';

  return useQuery({
    queryKey: [
      ...bomResourceKeys.all(organizationId),
      'serial-conflicts',
      normalizedSerial,
    ] as const,
    queryFn: async ({ signal }): Promise<BomSerialConflict[]> => {
      const { data } = await apiClient.get<{ data: BomSerialConflict[] }>(
        `/bom-items/check-serial?serialNumber=${encodeURIComponent(normalizedSerial)}`,
        { headers: orgHeaders, signal },
      );
      return data.data ?? [];
    },
    enabled: isReady && normalizedSerial.length > 0,
    staleTime: 15_000,
  });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createResourceKeys, defineResource } from '../core';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils/error';

// ============================================================================
// Types
// ============================================================================
//
// The project-scoped BOM: what was quoted, what is needed now, and the
// difference between them. Mirrors BomResponseDto / BomItemResponseDto /
// BomTotalsDto / BomChangeResponseDto in
// apps/backend/src/modules/bom/dto/bom-response.dto.ts field-for-field.
//
// Deliberately NOT the `Bom` / `BomItem` interfaces exported from
// `@tejas96/shared/types` — those still describe the polymorphic
// (entityType/entityId) snapshot that `GET /projects/:projectId/bom`
// replaced, and this task does not touch the shared package.

export type BomLineChangeState = 'unchanged' | 'added' | 'increased' | 'decreased' | 'removed';
export type BomItemSource = 'quote' | 'site' | 'office';
export type BomItemAllocationStatus = 'allocated' | 'partial' | 'pending';
export type BomAllocationStatus = 'pending' | 'partial' | 'fully_allocated';
export type BomChangeType = 'add' | 'quantity' | 'remove' | 'replace';

export interface BomItemSerial {
  id: string;
  serialNumber: string;
}

export interface BomItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string | null;
  brandName: string | null;
  productTypeCode: string | null;
  unit: string;
  pricingBasis: string;
  /** What the baseline quote said. Null means this line was never quoted — added after conversion. */
  quotedQuantity: number | null;
  /** What the project needs now. */
  quantity: number;
  unitPricePaise: number;
  quotedTotalPaise: number;
  currentTotalPaise: number;
  variancePaise: number;
  source: BomItemSource;
  changeState: BomLineChangeState;
  allocationStatus: BomItemAllocationStatus;
  serials: BomItemSerial[];
  sortOrder: number;
}

export interface BomTotals {
  quotedPaise: number;
  currentPaise: number;
  variancePaise: number;
  /** The change log's own claim about variance from quote — should equal variancePaise. */
  varianceFromLogPaise: number;
  /** False means the change log and the line items disagree; nothing here can be trusted. */
  reconciles: boolean;
  lineCount: number;
  addedLineCount: number;
  removedLineCount: number;
  changedLineCount: number;
}

export interface Bom {
  id: string;
  bomNumber: string;
  projectId: string;
  baselineQuoteVersionId: string | null;
  notes: string | null;
  allocationStatus: BomAllocationStatus;
  items: BomItem[];
  totals: BomTotals;
  createdAt: string;
  updatedAt: string;
}

/** One row of the append-only change log — every edit, with its reason. */
export interface BomChange {
  id: string;
  bomId: string;
  /** Null when the change is not about one particular row. */
  bomItemId: string | null;
  productId: string;
  changeType: BomChangeType;
  quantityBefore: number | null;
  quantityAfter: number | null;
  /** What a 'replace' swapped out. Null on every other change type. */
  replacedProductId: string | null;
  unitPricePaise: number;
  costImpactPaise: number;
  reason: string;
  source: BomItemSource;
  createdBy: string;
  createdAt: string;
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
    view: 'quotes.view',
  },
);

export const bomResourceKeys = createResourceKeys('bom');

// ============================================================================
// Hooks — reads
// ============================================================================

/**
 * The project's bill of materials: what was quoted, what is needed now, and
 * the variance between them, per line and in total.
 *
 * Replaces `useEntityBom('project', projectId)`, which read
 * `GET /bom?entityType=&entityId=` — a polymorphic lookup Task 16 deleted.
 * There is one BOM per project now, reached through the project's own id.
 */
export function useProjectBom(projectId: string | undefined) {
  return useQuery({
    queryKey: [...bomResourceKeys.all(), 'project', projectId] as const,
    queryFn: async ({ signal }): Promise<Bom> => {
      const { data } = await apiClient.get<Bom>(`/projects/${projectId}/bom`, { signal });
      return data;
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

/**
 * The BOM's change log, newest first — every add, quantity change, product
 * swap and removal, each carrying the reason it was made.
 */
export function useBomChanges(projectId: string | undefined) {
  return useQuery({
    queryKey: [...bomResourceKeys.all(), 'changes', projectId] as const,
    queryFn: async ({ signal }): Promise<BomChange[]> => {
      const { data } = await apiClient.get<BomChange[]>(`/projects/${projectId}/bom/changes`, {
        signal,
      });
      return data;
    },
    enabled: !!projectId,
    staleTime: 15_000,
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

// ============================================================================
// Hooks — edits
// ============================================================================
//
// All four share one shape: mutate, invalidate the BOM (its totals and
// allocation status both move) and stock-allocations (a bump can consume
// stock, a drop or a removal can free it), then toast the money — that is
// the point of a reason-attributed edit.

export interface BomEditResult {
  costImpactPaise: number;
}

export interface AddBomItemPayload {
  productId: string;
  quantity: number;
  reason: string;
}

export interface AddBomItemResult extends BomEditResult {
  itemId: string;
}

/** Add a product to the project BOM as a new line. */
export function useAddBomItem(projectId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation<AddBomItemResult, unknown, AddBomItemPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<AddBomItemResult>(
        `/projects/${projectId}/bom/items`,
        payload,
      );
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['bom'] });
      void queryClient.invalidateQueries({ queryKey: ['stock-allocations'] });
      const rupees = Math.abs(data.costImpactPaise) / 100;
      const direction = data.costImpactPaise >= 0 ? 'added to' : 'removed from';
      showToast.success(
        `Saved. ₹${rupees.toLocaleString('en-IN')} ${direction} the project's material cost.`,
      );
    },
    onError: (err) => {
      showToast.error(getErrorMessage(err));
    },
  });

  return {
    ...mutation,
    execute: (payload: AddBomItemPayload) => mutation.mutateAsync(payload),
  };
}

export interface ChangeBomQuantityPayload {
  itemId: string;
  quantity: number;
  reason: string;
}

/** Change one BOM line's quantity. Zero is a removal — see useRemoveBomItem. */
export function useChangeBomQuantity(projectId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation<BomEditResult, unknown, ChangeBomQuantityPayload>({
    mutationFn: async ({ itemId, quantity, reason }) => {
      const { data } = await apiClient.patch<BomEditResult>(
        `/projects/${projectId}/bom/items/${itemId}`,
        { quantity, reason },
      );
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['bom'] });
      void queryClient.invalidateQueries({ queryKey: ['stock-allocations'] });
      const rupees = Math.abs(data.costImpactPaise) / 100;
      const direction = data.costImpactPaise >= 0 ? 'added to' : 'removed from';
      showToast.success(
        `Saved. ₹${rupees.toLocaleString('en-IN')} ${direction} the project's material cost.`,
      );
    },
    onError: (err) => {
      showToast.error(getErrorMessage(err));
    },
  });

  return {
    ...mutation,
    execute: (payload: ChangeBomQuantityPayload) => mutation.mutateAsync(payload),
  };
}

export interface ReplaceBomItemPayload {
  itemId: string;
  replaceWithProductId: string;
  reason: string;
}

export interface ReplaceBomItemResult extends BomEditResult {
  newItemId: string;
}

/** Swap a line's product, keeping its quantity and its place in the list. */
export function useReplaceBomItem(projectId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation<ReplaceBomItemResult, unknown, ReplaceBomItemPayload>({
    mutationFn: async ({ itemId, replaceWithProductId, reason }) => {
      const { data } = await apiClient.patch<ReplaceBomItemResult>(
        `/projects/${projectId}/bom/items/${itemId}`,
        { replaceWithProductId, reason },
      );
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['bom'] });
      void queryClient.invalidateQueries({ queryKey: ['stock-allocations'] });
      const rupees = Math.abs(data.costImpactPaise) / 100;
      const direction = data.costImpactPaise >= 0 ? 'added to' : 'removed from';
      showToast.success(
        `Saved. ₹${rupees.toLocaleString('en-IN')} ${direction} the project's material cost.`,
      );
    },
    onError: (err) => {
      showToast.error(getErrorMessage(err));
    },
  });

  return {
    ...mutation,
    execute: (payload: ReplaceBomItemPayload) => mutation.mutateAsync(payload),
  };
}

export interface RemoveBomItemPayload {
  itemId: string;
  reason: string;
}

/**
 * Take a line off the BOM. Nothing is deleted server-side: the line is kept
 * at quantity 0 so a removed quoted line stays visible against its baseline.
 */
export function useRemoveBomItem(projectId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation<BomEditResult, unknown, RemoveBomItemPayload>({
    mutationFn: async ({ itemId, reason }) => {
      const { data } = await apiClient.delete<BomEditResult>(
        `/projects/${projectId}/bom/items/${itemId}`,
        { data: { reason } },
      );
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['bom'] });
      void queryClient.invalidateQueries({ queryKey: ['stock-allocations'] });
      const rupees = Math.abs(data.costImpactPaise) / 100;
      const direction = data.costImpactPaise >= 0 ? 'added to' : 'removed from';
      showToast.success(
        `Saved. ₹${rupees.toLocaleString('en-IN')} ${direction} the project's material cost.`,
      );
    },
    onError: (err) => {
      showToast.error(getErrorMessage(err));
    },
  });

  return {
    ...mutation,
    execute: (payload: RemoveBomItemPayload) => mutation.mutateAsync(payload),
  };
}

// ============================================================================
// Hooks — serials
// ============================================================================

interface BomMutationContext {
  snapshots: Array<[readonly unknown[], Bom | null | undefined]>;
}

export interface SetBomItemSerialsPayload {
  itemId: string;
  /** The whole serial list for this line. Send [] to clear it. */
  serials: string[];
}

/**
 * Replace the whole serial-number list for one BOM line.
 *
 * Replaces `useUpdateBomItemSerial` (one serial, one exploded row) and
 * `useBulkUpdateBomItemSerials` (many rows, one serial each) — both existed
 * only because a serialized line used to be one bom_items row per unit.
 * Serials now live on their own table under a single per-product line, so
 * there is one route (`PATCH /bom-items/:itemId/serials`) and one hook.
 *
 * No 404-recovery branch: the old mutation could lose a race against a
 * quantity change that deleted the very row it was patching, because units
 * used to be exploded into one row each and a quantity drop deleted rows.
 * A line is never deleted now — only ever kept at quantity 0 — so that race
 * cannot happen.
 */
export function useSetBomItemSerials() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    BomItemSerial[],
    unknown,
    SetBomItemSerialsPayload,
    BomMutationContext
  >({
    mutationFn: async ({ itemId, serials }) => {
      const { data } = await apiClient.patch<{ data: BomItemSerial[] }>(
        `/bom-items/${itemId}/serials`,
        { serials },
      );
      return data.data;
    },
    onMutate: async ({ itemId, serials }) => {
      const targetKeyPrefix = bomResourceKeys.all();
      await queryClient.cancelQueries({ queryKey: targetKeyPrefix });

      const snapshots = queryClient.getQueriesData<Bom | null>({ queryKey: targetKeyPrefix });
      for (const [queryKey, cachedBom] of snapshots) {
        if (!cachedBom) continue;
        const updatedItems = cachedBom.items.map((item) => {
          if (item.id !== itemId) return item;
          // Optimistic only — the real rows come back in onSuccess. An
          // existing id is kept where a serial's position didn't move, so
          // this doesn't thrash React's reconciliation keys for the common
          // one-entry edit.
          const optimisticSerials = serials.map((serialNumber, index) => ({
            id: item.serials[index]?.id ?? `pending-${itemId}-${index}`,
            serialNumber,
          }));
          return { ...item, serials: optimisticSerials };
        });
        queryClient.setQueryData<Bom>(queryKey, { ...cachedBom, items: updatedItems });
      }

      return { snapshots };
    },
    onSuccess: (updatedSerials, { itemId }) => {
      const targetKeyPrefix = bomResourceKeys.all();
      const snapshots = queryClient.getQueriesData<Bom | null>({ queryKey: targetKeyPrefix });
      for (const [queryKey, cachedBom] of snapshots) {
        if (!cachedBom) continue;
        const updatedItems = cachedBom.items.map((item) =>
          item.id === itemId ? { ...item, serials: updatedSerials } : item,
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
    execute: (payload: SetBomItemSerialsPayload) => mutation.mutateAsync(payload),
  };
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

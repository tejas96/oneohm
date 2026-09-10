'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createResourceKeys } from '../core';

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
// The `Bom` / `BomItem` interfaces in `@tejas96/shared/types` now describe
// this same response — Task 20 replaced the polymorphic (entityType/entityId)
// shape they used to carry. These stay local because every resource module
// here declares the shape it fetches; keep the two in step when the DTO moves.

export type BomLineChangeState = 'unchanged' | 'added' | 'increased' | 'decreased' | 'removed';
type BomItemSource = 'quote' | 'site' | 'office';
type BomItemAllocationStatus = 'allocated' | 'partial' | 'pending';
type BomAllocationStatus = 'pending' | 'partial' | 'fully_allocated';
export type BomChangeType = 'add' | 'quantity' | 'remove' | 'replace';

interface BomItemSerial {
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

interface BomTotals {
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
  /**
   * Panel capacity in watts-peak, as quoted and as the bill stands. Null when
   * the bill carries no panels, or none with a rated wattage — absent, not
   * zero, so a shortfall is never claimed that cannot be measured.
   */
  quotedSystemWp: number | null;
  currentSystemWp: number | null;
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
  /** Resolved display name for `createdBy`. Null when it doesn't resolve to a named user. */
  createdByName: string | null;
  createdAt: string;
}

// ============================================================================
// Query keys
// ============================================================================

// There is deliberately no `defineResource('bom', ...)` here. It registered
// `GET /bom` as a generic FDAL list endpoint, and that route no longer exists —
// the BOM is read per project via `GET /projects/:projectId/bom`. A registration
// is only ever read by `getResourceConfig` / `getResourcePermissions`, and
// nothing passes 'bom' to either, so it was dead config pointing at a dead route.
//
// `createResourceKeys` is unrelated: it just namespaces the query keys below.
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

      // Three outcomes, not two. The old branch tested only `pendingStock`,
      // so a run that reserved NOTHING — every product short, `allocated`
      // empty — still reported "Stock partially reserved", telling the
      // operator something had happened when nothing had. That is the most
      // likely outcome on a warehouse that has not been stocked yet, and it
      // is the one worth naming precisely: what is short, and by how much.
      const shortfalls = data.pendingStock
        .map((p) => `${p.name} (short ${p.shortfall})`)
        .join(', ');

      if (data.allocated.length === 0 && data.pendingStock.length > 0) {
        showToast.warning(`Nothing could be reserved — ${shortfalls}.`);
      } else if (data.pendingStock.length > 0) {
        showToast.warning(`Reserved ${data.allocated.length} item(s). Still short: ${shortfalls}.`);
      } else if (data.allocated.length > 0) {
        showToast.success(`Stock reserved for ${data.allocated.length} item(s).`);
      } else {
        // Nothing allocated, nothing short: every line was already covered by
        // an earlier reservation. Silence here reads as a failed click.
        showToast.success('Every line is already reserved.');
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

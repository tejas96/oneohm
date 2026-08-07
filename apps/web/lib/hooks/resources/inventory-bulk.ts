'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import {
  RESOURCE_MUTATION_DEFAULTS,
  createResourceKeys,
  normalizeApiError,
  resourceEvents,
} from '../core';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';

/**
 * FDAL hooks for the bulk endpoints introduced in Part 4 (PO bulk
 * approve / cancel, allocation bulk cancel, dispatch bulk cancel).
 *
 * Why this lives in its own file (instead of being added to the
 * existing per-resource hook files): every bulk endpoint returns the
 * same partial-success shape — `{ succeeded: string[]; failed: { id,
 * reason }[] }` — and the post-mutation invalidation surface is
 * uniform (invalidate the resource's list/detail buckets + any
 * `invalidateRelated` ones). Centralising here keeps the contract
 * tight and lets the consumer surface partial failures with the same
 * UI affordance everywhere.
 *
 * Toast policy: bulk operations don't auto-toast; the consumer
 * decides (e.g. "5 of 7 cancelled — see details" with a link to a
 * drawer listing the failures). Auto-toasting "1 of 7 succeeded" with
 * a generic message hides too much information.
 */

export interface BulkResult {
  succeeded: string[];
  failed: Array<{ id: string; reason: string }>;
}

export interface BulkCancelPayload {
  ids: string[];
  /** Optional reason; if present forwarded as `reason` per backend DTO. */
  reason?: string;
}

interface UseBulkMutationOptions {
  /** Resource key for invalidation, e.g. 'purchase-orders'. */
  resource: string;
  endpoint: string;
  /** Other resource keys to invalidate after the mutation completes. */
  invalidateRelated?: ReadonlyArray<string>;
  /** Reasoning the action emits to the resource event bus. */
  eventType?: 'updated' | 'archived' | 'bulkDeleted';
}

function useBulkMutation<TPayload extends { ids: string[] }>(
  opts: UseBulkMutationOptions,
): UseMutationResult<BulkResult, unknown, TPayload> {
  const queryClient = useQueryClient();
  const keys = useMemo(() => createResourceKeys(opts.resource), [opts.resource]);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: keys.all() });
    opts.invalidateRelated?.forEach((related) => {
      const relatedKeys = createResourceKeys(related);
      void queryClient.invalidateQueries({ queryKey: relatedKeys.all() });
    });
  }, [queryClient, keys, opts.invalidateRelated]);

  return useMutation<BulkResult, unknown, TPayload>({
    retry: RESOURCE_MUTATION_DEFAULTS.retry,
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<BulkResult>(opts.endpoint, payload);
      return data;
    },
    onSuccess: (result) => {
      invalidate();
      // Best-effort detail-cache eviction for the items we know mutated.
      result.succeeded.forEach((id) => {
        void queryClient.invalidateQueries({ queryKey: keys.detail(id) });
      });
      resourceEvents.emit(opts.resource, opts.eventType ?? 'updated', {
        ids: result.succeeded,
      });
    },
    onError: (err) => {
      // Bulk operations only emit a toast on hard failures (network /
      // 500). Per-item failures show up inside the BulkResult and are
      // the consumer's responsibility to surface.
      showToast.error(normalizeApiError(err).message);
    },
  });
}

export interface UseInventoryBulkReturn {
  approvePOs: UseMutationResult<BulkResult, unknown, { ids: string[] }>;
  cancelPOs: UseMutationResult<BulkResult, unknown, BulkCancelPayload>;
  cancelAllocations: UseMutationResult<BulkResult, unknown, BulkCancelPayload>;
  cancelDispatches: UseMutationResult<BulkResult, unknown, BulkCancelPayload>;
}

/**
 * Aggregated bulk-action hook returning every bulk mutation the inventory
 * module supports. Consumers usually only need one or two of them
 * (e.g. the PO list uses `approvePOs` + `cancelPOs`); the aggregation
 * keeps the ergonomics simple — one hook call instead of four.
 */
export function useInventoryBulk(): UseInventoryBulkReturn {
  const approvePOs = useBulkMutation<{ ids: string[] }>({
    resource: 'purchase-orders',
    endpoint: '/purchase-orders/bulk/approve',
    invalidateRelated: ['inventory-stock', 'inventory-transactions'],
  });

  const cancelPOs = useBulkMutation<BulkCancelPayload>({
    resource: 'purchase-orders',
    endpoint: '/purchase-orders/bulk/cancel',
    invalidateRelated: ['inventory-stock', 'inventory-transactions'],
  });

  const cancelAllocations = useBulkMutation<BulkCancelPayload>({
    resource: 'stock-allocations',
    endpoint: '/stock-allocations/bulk/cancel',
    invalidateRelated: ['inventory-stock', 'inventory-transactions', 'material-dispatches'],
  });

  const cancelDispatches = useBulkMutation<BulkCancelPayload>({
    resource: 'material-dispatches',
    endpoint: '/material-dispatches/bulk/cancel',
    invalidateRelated: ['stock-allocations', 'inventory-stock', 'inventory-transactions'],
  });

  return useMemo(
    () => ({ approvePOs, cancelPOs, cancelAllocations, cancelDispatches }),
    [approvePOs, cancelPOs, cancelAllocations, cancelDispatches],
  );
}

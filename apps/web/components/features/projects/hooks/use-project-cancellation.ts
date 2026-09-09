'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { LossReason } from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { projectDetailKeys } from './use-project-detail';
import { projectKeys } from './use-projects';

import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

/**
 * What a cancelled project still has hanging, derived at read time on the
 * backend from the rows themselves — see ProjectCancellationService.getCleanup.
 */
export interface CancellationCleanup {
  unitsAtSite: number;
  pendingReturns: number;
  openPurchaseOrders: number;
  unrecoveredCommissions: number;
  settled: boolean;
  state: 'cleanup_pending' | 'settled';
}

export interface SettlementPreviewLine {
  payerType: 'customer' | 'lender';
  collectedPaise: number;
}

export interface CancelProjectSettlement {
  payerType: 'customer' | 'lender';
  /** Paise we keep. The rest is refunded. */
  keptPaise: number;
}

export interface CancelProjectPayload {
  lossReason: LossReason;
  cancelReason: string;
  propertyOutcome: 'close' | 'requote';
  /** One line per payer that has paid. Omit a payer to keep everything. */
  settlements?: CancelProjectSettlement[];
}

// ============================================================================
// Query keys
// ============================================================================

export const cancellationKeys = {
  cleanup: (projectId: string) =>
    [...projectDetailKeys.detail(projectId), 'cancellation-cleanup'] as const,
  settlementPreview: (projectId: string) =>
    [...projectDetailKeys.detail(projectId), 'settlement-preview'] as const,
};

// ============================================================================
// Queries
// ============================================================================

/**
 * Shared by the header's "Cancelled — cleanup pending / settled" title and
 * the cleanup card's line items — same query key, so both read the same
 * cached response and cannot show different states for the same project.
 */
export function useCancellationCleanup(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<CancellationCleanup, AxiosError> {
  return useQuery({
    queryKey: cancellationKeys.cleanup(projectId),
    queryFn: async (): Promise<CancellationCleanup> => {
      const { data } = await apiClient.get<CancellationCleanup>(
        `/projects/${projectId}/cancellation-cleanup`,
        {},
      );
      return data;
    },
    enabled: !!projectId && options?.enabled !== false,
  });
}

/**
 * What each payer has actually collected, to pre-fill the cancel dialog's
 * settlement lines. Backed by the same figure the cancel transaction uses for
 * its refund math — never sum `allocatedPaise` off the milestones endpoint
 * instead, which misses cash collected but never allocated to a milestone.
 */
export function useSettlementPreview(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<SettlementPreviewLine[], AxiosError> {
  return useQuery({
    queryKey: cancellationKeys.settlementPreview(projectId),
    queryFn: async (): Promise<SettlementPreviewLine[]> => {
      const { data } = await apiClient.get<SettlementPreviewLine[]>(
        `/projects/${projectId}/settlement-preview`,
        {},
      );
      return data;
    },
    enabled: !!projectId && options?.enabled !== false,
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Cancellation no longer goes through the plain status dropdown — the API
 * rejects that transition. This is the only route in.
 */
export function useCancelProject(
  projectId: string,
): UseMutationResult<unknown, AxiosError, CancelProjectPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CancelProjectPayload) => {
      const { data } = await apiClient.post(`/projects/${projectId}/cancel`, payload, {});
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectDetailKeys.detail(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      // The property outcome (closed lost, or handed back for a re-quote)
      // changes what the property screens show next.
      void queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}

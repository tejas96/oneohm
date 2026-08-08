'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useMemo } from 'react';

import type { MilestoneAggregateItem, MilestoneWithPayment } from './types';
import { PROJECT_MILESTONE_AGG_QUERY_KEY } from '../constants';

import { apiClient } from '@/lib/api/client';

// ============================================================================
// Query Keys
// ============================================================================

/**
 * Cache key namespace for the legacy `/payments` route. Retained because
 * `useReceiptMutations` invalidates `['payments']` to keep older
 * consumers (and any out-of-tree integrations) refreshed in lockstep
 * with the receipts ledger. The list/summary fetchers themselves were
 * removed when the Finance subsystem shipped; consumers should use
 * `useProjectReceiptSummary` / `useProjectReceipts` from FDAL instead.
 */
export const paymentKeys = {
  all: () => ['payments'] as const,
  byProject: (projectId: string) => [...paymentKeys.all(), 'project', projectId] as const,
  summary: (projectId: string) => [...paymentKeys.all(), 'summary', projectId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetches aggregated milestone data for a project via the dedicated aggregation endpoint.
 * Milestones are computed live from project_tasks — no dedicated milestone table.
 */
export function useProjectMilestones(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<MilestoneAggregateItem[], AxiosError> {
  return useQuery({
    queryKey: PROJECT_MILESTONE_AGG_QUERY_KEY(projectId),
    queryFn: async (): Promise<MilestoneAggregateItem[]> => {
      const { data } = await apiClient.get<MilestoneAggregateItem[]>(
        `/projects/${projectId}/milestones`,
      );
      return data;
    },
    enabled: !!projectId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

/**
 * @deprecated Use useProjectMilestones instead.
 * Kept for backward compatibility with overview financials.
 * Wraps useProjectMilestones and attaches empty payment stubs.
 */
export function usePaymentMilestones(
  projectId: string,
  options?: { enabled?: boolean },
): {
  data: MilestoneWithPayment[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} {
  const milestonesQuery = useProjectMilestones(projectId, options);

  const data = useMemo(() => {
    if (!milestonesQuery.data) return undefined;

    return milestonesQuery.data.map(
      (milestone): MilestoneWithPayment => ({
        ...milestone,
        payments: [],
        totalExpected: 0,
        totalPaid: 0,
        paymentStatus: 'pending',
      }),
    );
  }, [milestonesQuery.data]);

  return {
    data,
    isLoading: milestonesQuery.isLoading,
    isError: milestonesQuery.isError,
    error: milestonesQuery.error || null,
  };
}

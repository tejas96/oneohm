'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useMemo } from 'react';

import type {
  MilestoneAggregateItem,
  MilestoneWithPayment,
  PaymentSummaryDetail,
  ProjectPayment,
} from './types';
import { PROJECT_MILESTONE_AGG_QUERY_KEY } from '../constants';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

// ============================================================================
// Query Keys
// ============================================================================

export const paymentKeys = {
  all: (orgId?: string) => ['payments', orgId] as const,
  byProject: (orgId: string | undefined, projectId: string) =>
    [...paymentKeys.all(orgId), 'project', projectId] as const,
  summary: (orgId: string | undefined, projectId: string) =>
    [...paymentKeys.all(orgId), 'summary', projectId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useProjectPayments(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<ProjectPayment[], AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: paymentKeys.byProject(organizationId, projectId),
    queryFn: async (): Promise<ProjectPayment[]> => {
      const { data } = await apiClient.get<ProjectPayment[]>(`/payments/project/${projectId}`, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return data;
    },
    enabled: !!projectId && !!organizationId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useProjectPaymentSummary(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<PaymentSummaryDetail, AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: paymentKeys.summary(organizationId, projectId),
    queryFn: async (): Promise<PaymentSummaryDetail> => {
      const { data } = await apiClient.get<PaymentSummaryDetail>(
        `/payments/project/${projectId}/summary`,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    enabled: !!projectId && !!organizationId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

/**
 * Fetches aggregated milestone data for a project via the dedicated aggregation endpoint.
 * Milestones are computed live from project_tasks — no dedicated milestone table.
 */
export function useProjectMilestones(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<MilestoneAggregateItem[], AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: PROJECT_MILESTONE_AGG_QUERY_KEY(projectId),
    queryFn: async (): Promise<MilestoneAggregateItem[]> => {
      const { data } = await apiClient.get<MilestoneAggregateItem[]>(
        `/projects/${projectId}/milestones`,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    enabled: !!projectId && !!organizationId && options?.enabled !== false,
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

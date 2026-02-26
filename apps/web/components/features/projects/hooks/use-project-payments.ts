'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useMemo } from 'react';

import type {
  MilestoneWithPayment,
  PaymentSummaryDetail,
  ProjectPayment,
} from './types';
import { useProject } from './use-project-detail';

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
      const { data } = await apiClient.get<ProjectPayment[]>(
        `/payments/project/${projectId}`,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    enabled: !!projectId && !!organizationId && (options?.enabled !== false),
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
    enabled: !!projectId && !!organizationId && (options?.enabled !== false),
    staleTime: 30_000,
  });
}

/**
 * Derived hook: joins milestones from project response with payments data.
 * Business logic stays in the hook, not in UI components.
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
  const projectQuery = useProject(projectId, options);
  const paymentsQuery = useProjectPayments(projectId, options);

  const data = useMemo(() => {
    const milestones = projectQuery.data?.milestones;
    const payments = paymentsQuery.data;

    if (!milestones) return undefined;

    return milestones.map((milestone): MilestoneWithPayment => {
      const milestonePayments = (payments ?? []).filter(
        (p) => p.milestoneId === milestone.id,
      );
      const totalExpected = milestonePayments.reduce((sum, p) => sum + p.expectedAmount, 0);
      const totalPaid = milestonePayments.reduce((sum, p) => sum + p.paidAmount, 0);

      let paymentStatus: 'received' | 'due' | 'pending' = 'pending';
      if (totalPaid >= totalExpected && totalExpected > 0) {
        paymentStatus = 'received';
      } else if (totalExpected > 0) {
        paymentStatus = 'due';
      }

      return {
        ...milestone,
        payments: milestonePayments,
        totalExpected,
        totalPaid,
        paymentStatus,
      };
    });
  }, [projectQuery.data?.milestones, paymentsQuery.data]);

  return {
    data,
    isLoading: projectQuery.isLoading || paymentsQuery.isLoading,
    isError: projectQuery.isError || paymentsQuery.isError,
    error: projectQuery.error || paymentsQuery.error || null,
  };
}

'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { SubsidyStatus } from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

export interface CustomerSubsidyApplication {
  id: string;
  projectId: string;
  customerId: string;
  applicationNumber: string;
  applicationDate: string;
  subsidyScheme?: string | null;
  appliedAmount: number;
  approvedAmount?: number | null;
  status: SubsidyStatus;
  portalName?: string | null;
  notes?: string | null;
  project?: {
    id: string;
    projectNumber: string;
    name: string;
  };
}

export const customerSubsidyKeys = {
  all: (orgId?: string) => ['customer-subsidies', orgId] as const,
  byCustomer: (orgId: string | undefined, customerId: string) =>
    [...customerSubsidyKeys.all(orgId), customerId] as const,
};

export function useCustomerSubsidies(
  customerId: string,
  options?: { enabled?: boolean },
): UseQueryResult<CustomerSubsidyApplication[], AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: customerSubsidyKeys.byCustomer(organizationId, customerId),
    queryFn: async (): Promise<CustomerSubsidyApplication[]> => {
      const { data } = await apiClient.get<CustomerSubsidyApplication[]>(
        `/subsidy-applications/customer/${customerId}`,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    enabled: !!customerId && !!organizationId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { SubsidyStatus } from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';

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
  all: () => ['customer-subsidies'] as const,
  byCustomer: (customerId: string) => [...customerSubsidyKeys.all(), customerId] as const,
};

export function useCustomerSubsidies(
  customerId: string,
  options?: { enabled?: boolean },
): UseQueryResult<CustomerSubsidyApplication[], AxiosError> {
  return useQuery({
    queryKey: customerSubsidyKeys.byCustomer(customerId),
    queryFn: async (): Promise<CustomerSubsidyApplication[]> => {
      const { data } = await apiClient.get<CustomerSubsidyApplication[]>(
        `/subsidy-applications/customer/${customerId}`,
      );
      return data;
    },
    enabled: !!customerId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ProjectPriority, ProjectStatus } from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import type { CustomerPropertyResponse } from './use-customer-properties';

import { apiClient } from '@/lib/api/client';

export interface CustomerProjectItem {
  id: string;
  propertyId: string;
  quoteId: string;
  quoteNumber?: string;
  projectNumber: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  progressPercentage: number;
  systemSizeKw?: number;
  startDate?: string;
  endDate?: string;
  property: CustomerPropertyResponse;
}

export const customerProjectKeys = {
  all: () => ['customer-projects'] as const,
  byCustomer: (customerId: string) =>
    [...customerProjectKeys.all(), customerId] as const,
};

export function useCustomerProjects(
  customerId: string,
  options?: { enabled?: boolean },
): UseQueryResult<CustomerProjectItem[], AxiosError> {

  return useQuery({
    queryKey: customerProjectKeys.byCustomer(customerId),
    queryFn: async (): Promise<CustomerProjectItem[]> => {
      const { data } = await apiClient.get<CustomerProjectItem[]>(
        `/projects/customer/${customerId}`,
      );
      return data;
    },
    enabled: !!customerId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

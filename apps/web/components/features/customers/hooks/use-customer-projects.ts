'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ProjectPriority, ProjectStatus } from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import type { CustomerPropertyResponse } from './use-customer-properties';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

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
  all: (orgId?: string) => ['customer-projects', orgId] as const,
  byCustomer: (orgId: string | undefined, customerId: string) =>
    [...customerProjectKeys.all(orgId), customerId] as const,
};

export function useCustomerProjects(
  customerId: string,
  options?: { enabled?: boolean },
): UseQueryResult<CustomerProjectItem[], AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: customerProjectKeys.byCustomer(organizationId, customerId),
    queryFn: async (): Promise<CustomerProjectItem[]> => {
      const { data } = await apiClient.get<CustomerProjectItem[]>(
        `/projects/customer/${customerId}`,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    enabled: !!customerId && !!organizationId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

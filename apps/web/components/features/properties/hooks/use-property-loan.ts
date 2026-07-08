'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import type { CustomerLoanApplication } from '@/components/features/customers/hooks';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

export const propertyLoanKeys = {
  all: (orgId?: string) => ['property-loans', orgId] as const,
  detail: (orgId: string | undefined, propertyId: string) =>
    [...propertyLoanKeys.all(orgId), propertyId] as const,
};

export function usePropertyLoan(
  propertyId: string,
  options?: { enabled?: boolean },
): UseQueryResult<CustomerLoanApplication | null, AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: propertyLoanKeys.detail(organizationId, propertyId),
    queryFn: async (): Promise<CustomerLoanApplication | null> => {
      try {
        const { data } = await apiClient.get<CustomerLoanApplication | null>(
          `/loan-applications/property/${propertyId}`,
          { headers: { 'X-Organization-Id': organizationId } },
        );
        return data ?? null;
      } catch (error) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 204 || axiosError.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!propertyId && !!organizationId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

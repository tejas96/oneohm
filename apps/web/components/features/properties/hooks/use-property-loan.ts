'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import type { CustomerLoanApplication } from '@/components/features/customers/hooks';
import { apiClient } from '@/lib/api/client';

export const propertyLoanKeys = {
  all: () => ['property-loans'] as const,
  detail: (propertyId: string) =>
    [...propertyLoanKeys.all(), propertyId] as const,
};

export function usePropertyLoan(
  propertyId: string,
  options?: { enabled?: boolean },
): UseQueryResult<CustomerLoanApplication | null, AxiosError> {

  return useQuery({
    queryKey: propertyLoanKeys.detail(propertyId),
    queryFn: async (): Promise<CustomerLoanApplication | null> => {
      try {
        const { data } = await apiClient.get<CustomerLoanApplication | null>(
          `/loan-applications/property/${propertyId}`,
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
    enabled: !!propertyId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

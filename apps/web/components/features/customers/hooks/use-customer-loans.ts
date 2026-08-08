'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { LoanStatus } from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';

export interface CustomerLoanApplication {
  id: string;
  customerId: string;
  propertyId?: string | null;
  bankReferenceNumber?: string | null;
  lenderName?: string | null;
  lenderContact?: string | null;
  loanAmount?: number | null;
  status: LoanStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  property?: {
    id: string;
    propertyName?: string;
    city?: string;
  };
}

export const customerLoanKeys = {
  all: () => ['customer-loans'] as const,
  byCustomer: (customerId: string) => [...customerLoanKeys.all(), customerId] as const,
};

export function useCustomerLoans(
  customerId: string,
  options?: { enabled?: boolean },
): UseQueryResult<CustomerLoanApplication[], AxiosError> {
  return useQuery({
    queryKey: customerLoanKeys.byCustomer(customerId),
    queryFn: async (): Promise<CustomerLoanApplication[]> => {
      const { data } = await apiClient.get<CustomerLoanApplication[]>(
        `/loan-applications/customer/${customerId}`,
      );
      return data;
    },
    enabled: !!customerId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { LoanStatus } from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

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
  all: (orgId?: string) => ['customer-loans', orgId] as const,
  byCustomer: (orgId: string | undefined, customerId: string) =>
    [...customerLoanKeys.all(orgId), customerId] as const,
};

export function useCustomerLoans(
  customerId: string,
  options?: { enabled?: boolean },
): UseQueryResult<CustomerLoanApplication[], AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: customerLoanKeys.byCustomer(organizationId, customerId),
    queryFn: async (): Promise<CustomerLoanApplication[]> => {
      const { data } = await apiClient.get<CustomerLoanApplication[]>(
        `/loan-applications/customer/${customerId}`,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    enabled: !!customerId && !!organizationId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';

export interface CustomerFeedbackItem {
  id: string;
  projectId: string;
  customerId: string;
  overallRating?: number | null;
  npsScore?: number | null;
  npsCategory?: string | null;
  comments?: string | null;
  wouldRecommend?: boolean | null;
  companyResponse?: string | null;
  createdAt: string;
}

export const customerServiceKeys = {
  feedback: (orgId?: string, customerId?: string) =>
    ['customer-feedback', orgId, customerId] as const,
};

export function useCustomerFeedback(
  customerId: string,
  options?: { enabled?: boolean },
): UseQueryResult<CustomerFeedbackItem[], AxiosError> {
  return useQuery({
    queryKey: customerServiceKeys.feedback(customerId),
    queryFn: async (): Promise<CustomerFeedbackItem[]> => {
      const { data } = await apiClient.get<CustomerFeedbackItem[]>(
        `/customer-feedback/customer/${customerId}`,
      );
      return data;
    },
    enabled: !!customerId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

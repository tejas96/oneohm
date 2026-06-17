'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { QuoteStatus } from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { quoteKeys, type QuoteListItem } from '@/components/features/quotes';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

// ============================================================================
// Types (re-export for backward compatibility)
// ============================================================================

export type CustomerQuote = QuoteListItem;

export interface CustomerQuotesResponse {
  data: CustomerQuote[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export { quoteKeys };

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch all quotes for a specific customer
 *
 * @param customerId - The customer UUID to fetch quotes for
 * @param options - Optional pagination and filter options
 * @returns Paginated quotes for the customer
 *
 * @example
 * const { data, isLoading } = useCustomerQuotes(customerId);
 * // Access quotes: data?.data
 * // Access meta: data?.meta
 */
export function useCustomerQuotes(
  customerId: string,
  options?: {
    page?: number;
    limit?: number;
    status?: QuoteStatus;
  },
): UseQueryResult<CustomerQuotesResponse, AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 50;

  return useQuery({
    queryKey: [
      ...quoteKeys.byCustomer(organizationId, customerId),
      { page, limit, status: options?.status },
    ],
    queryFn: async (): Promise<CustomerQuotesResponse> => {
      const params = new URLSearchParams();
      params.append('customerId', customerId);
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (options?.status) {
        params.append('status', options.status);
      }

      const { data } = await apiClient.get<CustomerQuotesResponse>(`/quotes?${params.toString()}`, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return data;
    },
    enabled: !!customerId && !!organizationId,
  });
}

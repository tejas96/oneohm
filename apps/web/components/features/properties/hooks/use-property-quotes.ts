'use client';

import { QuoteStatus } from '@oneohm-epc/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import type { CustomerQuote, CustomerQuotesResponse } from '@/components/features/customers/hooks';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

// ============================================================================
// Query Keys
// ============================================================================

export const propertyQuoteKeys = {
  all: ['quotes'] as const,
  byProperty: (propertyId: string) => [...propertyQuoteKeys.all, 'property', propertyId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch all quotes for a specific property
 * Reuses CustomerQuote and CustomerQuotesResponse types from customer hooks
 *
 * @param propertyId - The property UUID to fetch quotes for
 * @param options - Optional pagination and filter options
 */
export function usePropertyQuotes(
  propertyId: string,
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
    queryKey: [...propertyQuoteKeys.byProperty(propertyId), { page, limit, status: options?.status }],
    queryFn: async (): Promise<CustomerQuotesResponse> => {
      const params = new URLSearchParams();
      params.append('propertyId', propertyId);
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (options?.status) {
        params.append('status', options.status);
      }

      const { data } = await apiClient.get<CustomerQuotesResponse>(
        `/quotes?${params.toString()}`,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    enabled: !!propertyId && !!organizationId,
  });
}

// Re-export types for convenience
export type { CustomerQuote, CustomerQuotesResponse };

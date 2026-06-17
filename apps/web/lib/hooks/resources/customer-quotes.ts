'use client';

import { QuoteStatus } from '@tejas96/shared/types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { createResourceKeys, useOrgContext } from '../core';

import {
  quoteKeys as featureQuoteKeys,
  type CustomerQuote,
  type CustomerQuotesResponse,
} from '@/components/features/customers/hooks/use-customer-quotes';
import { apiClient } from '@/lib/api/client';

// ── Types ──────────────────────────────────────────────────────

export type { CustomerQuote, CustomerQuotesResponse };
export { featureQuoteKeys as quoteKeys };

// ── Query Keys ─────────────────────────────────────────────────

const cqKeys = createResourceKeys('customer-quotes');

// ── Hooks ──────────────────────────────────────────────────────

/**
 * Fetch quotes for a specific customer.
 * Endpoint: GET /quotes?customerId=X
 */
export function useCustomerQuotes(
  customerId: string,
  opts?: { status?: QuoteStatus; page?: number; limit?: number },
): UseQueryResult<CustomerQuotesResponse> {
  const { orgHeaders, organizationId, isReady } = useOrgContext();
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 50;

  return useQuery<CustomerQuotesResponse>({
    queryKey: cqKeys.list(organizationId, {
      customerId,
      page,
      limit,
      status: opts?.status,
    }),
    queryFn: async (): Promise<CustomerQuotesResponse> => {
      const params = new URLSearchParams();
      params.append('customerId', customerId);
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (opts?.status) params.append('status', opts.status);

      const { data } = await apiClient.get<CustomerQuotesResponse>(`/quotes?${params.toString()}`, {
        headers: orgHeaders,
      });
      return data as CustomerQuotesResponse;
    },
    enabled: !!customerId && isReady,
  });
}

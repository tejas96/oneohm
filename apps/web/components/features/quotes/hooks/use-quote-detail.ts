'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import type { QuoteDetail } from './types';
import { quoteKeys } from './use-quotes';

import { apiClient } from '@/lib/api/client';

// ============================================================================
// Query Keys
// ============================================================================

export const quoteDetailKeys = {
  ...quoteKeys,
  versions: (id: string) => [...quoteKeys.detail(id), 'versions'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch enriched quote detail by ID.
 * Includes versions, customer contact info, property address,
 * pricing breakdown, and payment milestones.
 */
export function useQuoteDetail(
  quoteId: string,
  options?: { enabled?: boolean },
): UseQueryResult<QuoteDetail, AxiosError> {
  return useQuery({
    queryKey: quoteDetailKeys.detail(quoteId),
    queryFn: async (): Promise<QuoteDetail> => {
      const { data } = await apiClient.get<QuoteDetail>(`/quotes/${quoteId}`, {});
      return data;
    },
    enabled: !!quoteId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

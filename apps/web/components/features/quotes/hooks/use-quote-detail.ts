'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import type { QuoteDetail, QuoteVersionDetail } from './types';
import { quoteKeys } from './use-quotes';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

// ============================================================================
// Query Keys
// ============================================================================

export const quoteDetailKeys = {
  ...quoteKeys,
  versions: (orgId: string | undefined, id: string) =>
    [...quoteKeys.detail(orgId, id), 'versions'] as const,
  version: (orgId: string | undefined, quoteId: string, versionId: string) =>
    [...quoteKeys.detail(orgId, quoteId), 'version', versionId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch enriched quote detail by ID.
 * Includes versions (with current version's line items), customer contact info,
 * property address, pricing breakdown, and payment milestones.
 */
export function useQuoteDetail(
  quoteId: string,
  options?: { enabled?: boolean },
): UseQueryResult<QuoteDetail, AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: quoteDetailKeys.detail(organizationId, quoteId),
    queryFn: async (): Promise<QuoteDetail> => {
      const { data } = await apiClient.get<QuoteDetail>(`/quotes/${quoteId}`, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return data;
    },
    enabled: !!quoteId && !!organizationId && (options?.enabled !== false),
    staleTime: 30_000,
  });
}

/**
 * Fetch a specific version of a quote with its line items.
 * Used when viewing historical (non-current) versions.
 * Historical versions are immutable, so staleTime is set to Infinity.
 */
export function useQuoteVersion(
  quoteId: string,
  versionId: string | null,
  options?: { enabled?: boolean },
): UseQueryResult<QuoteVersionDetail, AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: quoteDetailKeys.version(organizationId, quoteId, versionId ?? ''),
    queryFn: async (): Promise<QuoteVersionDetail> => {
      const { data } = await apiClient.get<QuoteVersionDetail>(
        `/quotes/${quoteId}/versions/${versionId}`,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    enabled:
      !!quoteId &&
      !!versionId &&
      !!organizationId &&
      (options?.enabled !== false),
    staleTime: Infinity,
  });
}

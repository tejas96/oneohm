'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { QuoteStatus } from '@tejas96/shared/types';

import {
  type BaseFilters,
  buildQueryParams,
  createResourceKeys,
  defineResource,
  RESOURCE_QUERY_DEFAULTS,
  useOrgContext,
} from '../core';

import type {
  QuoteListItem,
  QuoteListResponse,
} from '@/components/features/quotes/hooks/use-quotes';
import { apiClient } from '@/lib/api/client';

// ============================================================================
// Filters
// ============================================================================

export interface QuoteListFilters extends BaseFilters {
  status?: QuoteStatus;
  customerId?: string;
  propertyId?: string;
  salesPersonId?: string;
  resellerId?: string;
  fromDate?: string;
  toDate?: string;
}

// ============================================================================
// Registry — registers 'quotes' resource config & permission keys
// URL sync is intentionally disabled: the page drives state via useTableUrlState
// and passes explicit filters down, avoiding duplicate URL param management.
// ============================================================================

defineResource<QuoteListItem>(
  'quotes',
  {
    endpoint: '/quotes',
    defaultPageSize: 10,
    minSearchLength: 2,
    searchDebounceMs: 300,
    syncToUrl: false,
    defaultSort: { field: 'createdAt', order: 'DESC' },
    staleTime: RESOURCE_QUERY_DEFAULTS.staleTime,
  },
  {
    view: 'quotes:read',
    create: 'quotes:create',
    delete: 'quotes:delete',
  },
);

// ============================================================================
// Query keys — follows FDAL createResourceKeys convention so that mutations
// which invalidate ['quotes', orgId] will also bust these list cache entries.
// ============================================================================

export const quoteResourceKeys = createResourceKeys('quotes');

// ============================================================================
// List hook
// ============================================================================

/**
 * FDAL list hook for the quotes resource.
 *
 * Accepts explicit `filters` driven by `useTableUrlState` in the page component
 * so that URL sync is owned by a single source of truth (the table).
 * Uses shared FDAL utilities (buildQueryParams, useOrgContext, createResourceKeys)
 * replacing the hand-rolled URLSearchParams construction in the legacy useQuotes hook.
 */
export function useQuoteListResource(filters: QuoteListFilters = {}) {
  const { organizationId, orgHeaders, isReady } = useOrgContext();

  return useQuery({
    queryKey: quoteResourceKeys.list(organizationId, filters as Record<string, unknown>),
    queryFn: async ({ signal }): Promise<QuoteListResponse> => {
      const params = buildQueryParams(filters, {
        minSearchLength: 2,
        skipValues: ['all'],
      });
      const { data } = await apiClient.get<QuoteListResponse>(`/quotes?${params.toString()}`, {
        headers: orgHeaders,
        signal,
      });
      return data;
    },
    enabled: isReady,
    placeholderData: keepPreviousData,
    staleTime: RESOURCE_QUERY_DEFAULTS.staleTime,
  });
}

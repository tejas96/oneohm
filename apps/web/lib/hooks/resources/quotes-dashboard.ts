'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { QuotesDashboard } from '@tejas96/shared/types';

import { createResourceKeys } from '../core';
import type { DashboardFilters } from './projects-dashboard';

import { apiClient } from '@/lib/api/client';

/** Exactly the query string sent; from/to only for a custom period. */
function toQuery(filters: DashboardFilters): string {
  const params = new URLSearchParams({ period: filters.period, financing: filters.financing });
  if (filters.period === 'custom' && filters.from && filters.to) {
    params.set('from', filters.from);
    params.set('to', filters.to);
  }
  if (filters.person) params.set('person', filters.person);
  return params.toString();
}

/**
 * Under the `quotes` resource key (`['quotes', …]`), the prefix every quote
 * mutation invalidates (`quoteKeys.all()` — save, send, accept, reject, void,
 * delete), so a changed quote refetches the dashboard too. Keyed on the request,
 * so two filter objects that send the same query share one entry.
 */
const quoteResourceKeys = createResourceKeys('quotes');
const quotesDashboardKeys = {
  summary: (query: string) => [...quoteResourceKeys.all(), 'dashboard', query] as const,
};

/** `keepPreviousData`: a filter change tweens old numbers to new ones, no skeleton flash. */
export function useQuotesDashboard(filters: DashboardFilters): UseQueryResult<QuotesDashboard> {
  const query = toQuery(filters);
  return useQuery({
    queryKey: quotesDashboardKeys.summary(query),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<QuotesDashboard>(`/quotes/dashboard?${query}`, {
        signal,
      });
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

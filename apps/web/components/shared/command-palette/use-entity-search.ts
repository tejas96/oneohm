'use client';

import { useMemo } from 'react';

import { useCustomers, type Customer } from '@/components/features/customers/hooks/use-customers';
import {
  useProjects,
  type ProjectListItem,
} from '@/components/features/projects/hooks/use-projects';
import { useQuotes, type QuoteListItem } from '@/components/features/quotes/hooks/use-quotes';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { getErrorMessage } from '@/lib/utils';

export interface UseEntitySearchResult {
  customers: Customer[];
  quotes: QuoteListItem[];
  projects: ProjectListItem[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
}

export function useEntitySearch(query: string, open: boolean): UseEntitySearchResult {
  const debouncedQuery = useDebounce(query, 300);
  const enabled = open && debouncedQuery.length >= 2;

  const filters = enabled ? { search: debouncedQuery, limit: 5 } : { limit: 5 };

  const customersQuery = useCustomers({ ...filters, enabled });
  const quotesQuery = useQuotes({ ...filters, enabled });
  const projectsQuery = useProjects({ ...filters, enabled });

  const isLoading =
    enabled && (customersQuery.isLoading || quotesQuery.isLoading || projectsQuery.isLoading);

  const error = customersQuery.error ?? quotesQuery.error ?? projectsQuery.error;
  const isError =
    enabled && !!(customersQuery.isError || quotesQuery.isError || projectsQuery.isError);

  return useMemo(
    () => ({
      customers: enabled ? (customersQuery.data?.data ?? []) : [],
      quotes: enabled ? (quotesQuery.data?.data ?? []) : [],
      projects: enabled ? (projectsQuery.data?.data ?? []) : [],
      isLoading,
      isError,
      errorMessage: isError && error ? getErrorMessage(error) : null,
    }),
    [enabled, customersQuery.data, quotesQuery.data, projectsQuery.data, isLoading, isError, error],
  );
}

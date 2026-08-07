'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { normalizeApiError } from './error-adapter';
import { buildQueryParams } from './query-builder';
import { RESOURCE_QUERY_DEFAULTS, RESOURCE_QUERY_RETRY } from './query-defaults';
import { createResourceKeys } from './query-keys';
import { defaultResponseAdapter } from './response-adapter';
import type { BaseFilters, ResourceConfig, ResourceListResponse } from './types';

interface UseInfiniteResourceListReturn<T> {
  items: T[];
  meta: ResourceListResponse<T>['meta'] | undefined;
  totalLoaded: number;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isError: boolean;
  error: ReturnType<typeof normalizeApiError> | null;
  refetch: () => void;
  queryKeys: ReturnType<typeof createResourceKeys>;
}

import { apiClient } from '@/lib/api/client';

export function useInfiniteResourceList<T, F extends BaseFilters = BaseFilters>(
  config: ResourceConfig<T, F>,
  filters?: Partial<F>,
): UseInfiniteResourceListReturn<T> {
  const keys = useMemo(() => createResourceKeys(config.resource), [config.resource]);
  const baseFilters = { ...config.defaultFilters, ...filters } as F;

  const endpointKey = config.endpoint !== `/${config.resource}` ? config.endpoint : undefined;

  const query = useInfiniteQuery({
    queryKey: [
      ...keys.infinite(baseFilters as Record<string, unknown>),
      ...(endpointKey ? [endpointKey] : []),
    ],
    queryFn: async ({ pageParam, signal }) => {
      const params = buildQueryParams({ ...baseFilters, page: pageParam } as F, {
        minSearchLength: config.minSearchLength,
      });
      const { data } = await apiClient.get(`${config.endpoint}?${params.toString()}`, {
        signal,
      });
      return (config.responseAdapter ?? defaultResponseAdapter<T>)(data);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: ResourceListResponse<T>) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
    enabled: true,
    retry: RESOURCE_QUERY_RETRY,
    staleTime: config.staleTime ?? RESOURCE_QUERY_DEFAULTS.staleTime,
  });

  const allItems = query.data?.pages.flatMap((p) => p.data) ?? [];
  const lastMeta = query.data?.pages[query.data.pages.length - 1]?.meta;

  return {
    items: allItems,
    meta: lastMeta,
    totalLoaded: allItems.length,

    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage === true,
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
    isError: query.isError,
    error: query.error ? normalizeApiError(query.error) : null,
    refetch: () => {
      void query.refetch();
    },
    queryKeys: keys,
  };
}

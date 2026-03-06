'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { normalizeApiError } from './error-adapter';
import { buildQueryParams } from './query-builder';
import { RESOURCE_QUERY_DEFAULTS, RESOURCE_QUERY_RETRY } from './query-defaults';
import { createResourceKeys } from './query-keys';
import { defaultResponseAdapter } from './response-adapter';
import type { BaseFilters, ResourceConfig, ResourceListResponse } from './types';
import { useOrgContext } from './use-org-context';

import { apiClient } from '@/lib/api/client';

export function useInfiniteResourceList<T, F extends BaseFilters = BaseFilters>(
  config: ResourceConfig<T, F>,
  filters?: Partial<F>,
) {
  const { organizationId, orgHeaders, isReady } = useOrgContext();
  const keys = useMemo(() => createResourceKeys(config.resource), [config.resource]);
  const baseFilters = { ...config.defaultFilters, ...filters } as F;

  const query = useInfiniteQuery({
    queryKey: keys.infinite(organizationId, baseFilters as Record<string, unknown>),
    queryFn: async ({ pageParam, signal }) => {
      const params = buildQueryParams({ ...baseFilters, page: pageParam } as F, {
        minSearchLength: config.minSearchLength,
      });
      const { data } = await apiClient.get(`${config.endpoint}?${params.toString()}`, {
        headers: config.requiresOrg !== false ? orgHeaders : {},
        signal,
      });
      return (config.responseAdapter ?? defaultResponseAdapter<T>)(data);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: ResourceListResponse<T>) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
    enabled: config.requiresOrg !== false ? isReady : true,
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
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
    isError: query.isError,
    error: query.error ? normalizeApiError(query.error) : null,
    refetch: () => {
      void query.refetch();
    },
    queryKeys: keys,
  };
}

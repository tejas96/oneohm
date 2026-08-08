'use client';

import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect, useCallback, useMemo, useRef } from 'react';

import { normalizeApiError } from './error-adapter';
import { buildQueryParams } from './query-builder';
import { RESOURCE_QUERY_DEFAULTS, RESOURCE_QUERY_RETRY } from './query-defaults';
import { createResourceKeys } from './query-keys';
import { defaultResponseAdapter } from './response-adapter';
import type {
  ResourceConfig,
  BaseFilters,
  ResourceListResponse,
  ResourceSelector,
  NormalizedError,
} from './types';
import { useQueryState, type UseQueryStateReturn } from './use-query-state';

import { apiClient } from '@/lib/api/client';

export interface UseResourceListReturn<T, F extends BaseFilters, R = ResourceListResponse<T>>
  extends Omit<UseQueryStateReturn<F>, 'setMeta'> {
  items: T[];
  meta: ResourceListResponse<T>['meta'] | undefined;
  selected: R;
  isEmpty: boolean;

  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: NormalizedError | null;
  refetch: () => void;

  queryKeys: ReturnType<typeof createResourceKeys>;
  prefetchPage: (page: number) => void;
}

export function useResourceList<
  T,
  F extends BaseFilters = BaseFilters,
  R = ResourceListResponse<T>,
>(
  config: ResourceConfig<T, F>,
  options?: {
    select?: ResourceSelector<T, R>;
    enabled?: boolean;
  },
): UseResourceListReturn<T, F, R> {
  const queryClient = useQueryClient();
  const keys = useMemo(() => createResourceKeys(config.resource), [config.resource]);

  const configRef = useRef(config);
  configRef.current = config;

  const queryState = useQueryState<F>({
    defaults: config.defaultFilters,
    defaultSort: config.defaultSort,
    defaultPageSize: config.defaultPageSize,
    searchDebounceMs: config.searchDebounceMs,
    syncToUrl: config.syncToUrl,
    persistKey: config.persistFilters ? `${config.resource}-filters` : undefined,
  });

  // Include the endpoint in the query key so hooks that share the same
  // `resource` name but hit different endpoints (e.g. the global
  // /inventory-stock list vs. /inventory-stock/warehouse/:id on the
  // warehouse detail page) never share the same cache entry.
  const endpointKey = config.endpoint !== `/${config.resource}` ? config.endpoint : undefined;

  const query = useQuery({
    queryKey: [
      ...keys.list(queryState.activeFilters as Record<string, unknown>),
      ...(endpointKey ? [endpointKey] : []),
    ],
    queryFn: async ({ signal }) => {
      const params = buildQueryParams(queryState.activeFilters, {
        minSearchLength: config.minSearchLength,
        paramMapping: config.paramMapping,
      });
      const { data } = await apiClient.get(`${config.endpoint}?${params.toString()}`, {
        signal,
      });
      const adapter = config.responseAdapter ?? defaultResponseAdapter<T>;
      return adapter(data);
    },
    enabled: options?.enabled ?? true,
    retry: RESOURCE_QUERY_RETRY,
    placeholderData: keepPreviousData,
    staleTime: config.staleTime ?? RESOURCE_QUERY_DEFAULTS.staleTime,
    gcTime: config.gcTime ?? RESOURCE_QUERY_DEFAULTS.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus:
      config.refetchOnWindowFocus ?? RESOURCE_QUERY_DEFAULTS.refetchOnWindowFocus,
    select: options?.select as ((data: ResourceListResponse<T>) => R) | undefined,
  });

  // Inject server-side pagination meta into queryState
  const rawData = query.data as ResourceListResponse<T> | undefined;
  const meta = rawData?.meta;
  const { setMeta } = queryState;
  useEffect(() => {
    if (meta) {
      setMeta({ total: meta.total, totalPages: meta.totalPages });
    }
  }, [meta?.total, meta?.totalPages, setMeta]);

  const prefetchPage = useCallback(
    (page: number) => {
      const cfg = configRef.current;
      const prefetchFilters = { ...queryState.activeFilters, page } as unknown as Record<
        string,
        unknown
      >;
      const prefetchEndpointKey = cfg.endpoint !== `/${cfg.resource}` ? cfg.endpoint : undefined;
      void queryClient.prefetchQuery({
        queryKey: [
          ...keys.list(prefetchFilters),
          ...(prefetchEndpointKey ? [prefetchEndpointKey] : []),
        ],
        queryFn: async ({ signal }) => {
          const params = buildQueryParams({ ...queryState.activeFilters, page } as F, {
            minSearchLength: cfg.minSearchLength,
            paramMapping: cfg.paramMapping,
          });
          const { data } = await apiClient.get(`${cfg.endpoint}?${params.toString()}`, {
            signal,
          });
          return (cfg.responseAdapter ?? defaultResponseAdapter<T>)(data);
        },
        staleTime: cfg.staleTime ?? RESOURCE_QUERY_DEFAULTS.staleTime,
      });
    },
    [queryState.activeFilters, keys, queryClient],
  );

  const fullData = query.data as ResourceListResponse<T> | undefined;

  return {
    items: fullData?.data ?? [],
    meta: fullData?.meta,
    selected: query.data as R,
    isEmpty: !query.isLoading && (fullData?.data.length ?? 0) === 0,

    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error ? normalizeApiError(query.error) : null,
    refetch: () => {
      void query.refetch();
    },

    search: queryState.search,
    setSearch: queryState.setSearch,
    debouncedSearch: queryState.debouncedSearch,
    clearSearch: queryState.clearSearch,
    filters: queryState.filters,
    setFilter: queryState.setFilter,
    setFilters: queryState.setFilters,
    replaceFilters: queryState.replaceFilters,
    clearFilters: queryState.clearFilters,
    hasActiveFilters: queryState.hasActiveFilters,
    pagination: queryState.pagination,
    sorting: queryState.sorting,
    activeFilters: queryState.activeFilters,
    queryKeys: keys,
    prefetchPage,
  };
}

'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';

import { normalizeApiError } from './error-adapter';
import { buildQueryParams } from './query-builder';
import { RESOURCE_QUERY_DEFAULTS, RESOURCE_QUERY_RETRY } from './query-defaults';
import { stableHash } from './query-keys';
import { defaultResponseAdapter } from './response-adapter';
import type { SubResourceConfig, BaseFilters, ResourceListResponse } from './types';
import { useOrgContext } from './use-org-context';

interface UseResourceSubListReturn<T> {
  items: T[];
  meta: ResourceListResponse<T>['meta'] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: ReturnType<typeof normalizeApiError> | null;
  refetch: () => void;
}

import { apiClient } from '@/lib/api/client';

export function useResourceSubList<T, F extends BaseFilters = BaseFilters>(
  config: SubResourceConfig<T, F>,
  parentId: string,
  filters?: Partial<F>,
): UseResourceSubListReturn<T> {
  const { organizationId, orgHeaders, isReady } = useOrgContext();
  const mergedFilters = { ...config.defaultFilters, ...filters } as F;

  const query = useQuery({
    queryKey: [
      config.resource,
      organizationId,
      'by-parent',
      config.parentResource,
      parentId,
      stableHash(mergedFilters as Record<string, unknown>),
    ] as const,
    queryFn: async ({ signal }) => {
      let url: string;
      if (config.parentIdInPath) {
        url = config.endpoint.replace('{parentId}', parentId);
      } else {
        const params = buildQueryParams(mergedFilters);
        if (config.parentIdParam) params.set(config.parentIdParam, parentId);
        url = `${config.endpoint}?${params.toString()}`;
      }
      const { data } = await apiClient.get(url, {
        headers: config.requiresOrg !== false ? orgHeaders : {},
        signal,
      });
      if (Array.isArray(data)) {
        return {
          data,
          meta: { page: 1, limit: data.length, total: data.length, totalPages: 1 },
        } as ResourceListResponse<T>;
      }
      return (config.responseAdapter ?? defaultResponseAdapter<T>)(data);
    },
    enabled: !!parentId && (config.requiresOrg !== false ? isReady : true),
    retry: RESOURCE_QUERY_RETRY,
    staleTime: config.staleTime ?? RESOURCE_QUERY_DEFAULTS.staleTime,
    placeholderData: keepPreviousData,
  });

  return {
    items: query.data?.data ?? [],
    meta: query.data?.meta,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error ? normalizeApiError(query.error) : null,
    refetch: () => {
      void query.refetch();
    },
  };
}

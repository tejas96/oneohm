'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { normalizeApiError } from './error-adapter';
import { RESOURCE_QUERY_DEFAULTS, RESOURCE_QUERY_RETRY } from './query-defaults';
import { createResourceKeys } from './query-keys';
import type { NormalizedError } from './types';
import { useOrgContext } from './use-org-context';

import { apiClient } from '@/lib/api/client';

interface UseResourceDetailConfig<T> {
  resource: string;
  endpoint: string;
  id: string;
  requiresOrg?: boolean;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  select?: (data: T) => T;
}

export function useResourceDetail<T>(config: UseResourceDetailConfig<T>) {
  const { organizationId, orgHeaders, isReady } = useOrgContext();
  const keys = useMemo(() => createResourceKeys(config.resource), [config.resource]);

  const query = useQuery({
    queryKey: keys.detail(organizationId, config.id),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<T>(`${config.endpoint}/${config.id}`, {
        headers: config.requiresOrg !== false ? orgHeaders : {},
        signal,
      });
      return data;
    },
    enabled:
      !!config.id && (config.requiresOrg !== false ? isReady : true) && (config.enabled ?? true),
    retry: RESOURCE_QUERY_RETRY,
    staleTime: config.staleTime ?? RESOURCE_QUERY_DEFAULTS.staleTime,
    gcTime: config.gcTime ?? RESOURCE_QUERY_DEFAULTS.gcTime,
    select: config.select,
  });

  return {
    ...query,
    error: query.error ? normalizeApiError(query.error) : (null as NormalizedError | null),
  };
}

export function prefetchResourceDetail<T>(
  queryClient: ReturnType<typeof useQueryClient>,
  config: {
    resource: string;
    endpoint: string;
    id: string;
    organizationId?: string;
    orgHeaders?: Record<string, string>;
  },
) {
  const keys = createResourceKeys(config.resource);
  void queryClient.prefetchQuery({
    queryKey: keys.detail(config.organizationId, config.id),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<T>(`${config.endpoint}/${config.id}`, {
        headers: config.orgHeaders ?? {},
        signal,
      });
      return data;
    },
    staleTime: RESOURCE_QUERY_DEFAULTS.staleTime,
  });
}

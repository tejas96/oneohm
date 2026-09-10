'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { STALE_TIMES } from './query-defaults';
import { createResourceKeys } from './query-keys';
import type { StatsConfig } from './types';

import { apiClient } from '@/lib/api/client';

export interface UseResourceStatsReturn<TStats> {
  stats: TStats | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useResourceStats<TStats = Record<string, number>>(
  config: StatsConfig<TStats>,
): UseResourceStatsReturn<TStats> {
  const keys = useMemo(() => createResourceKeys(config.resource), [config.resource]);

  const query = useQuery({
    queryKey: keys.stats(),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get(config.endpoint, {
        signal,
      });
      return config.transform ? config.transform(data) : (data as TStats);
    },
    enabled: true,
    staleTime: config.staleTime ?? STALE_TIMES.standard,
  });

  return {
    stats: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}

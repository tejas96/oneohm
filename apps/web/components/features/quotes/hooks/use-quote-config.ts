'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { QuoteConfigResponse, SubsidyConfigResponse } from '../types';

import { apiClient } from '@/lib/api/client';
import { useProductOptions } from '@/lib/hooks/resources';
import { useAuth } from '@/providers/auth-provider';

// ============================================================================
// Query Keys (quote config + subsidy only — products use FDAL)
// ============================================================================

const quoteConfigKeys = {
  all: (orgId?: string) => ['quote-config', orgId] as const,
  config: (orgId?: string) => [...quoteConfigKeys.all(orgId), 'config'] as const,
  subsidyRules: (orgId?: string) => [...quoteConfigKeys.all(orgId), 'subsidy-rules'] as const,
};

// ============================================================================
// Hook
// ============================================================================

const FIVE_MINUTES = 5 * 60 * 1000;

export function useQuoteConfig() {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  const headers = useMemo(() => ({ 'X-Organization-Id': organizationId }), [organizationId]);

  const productOptions = useProductOptions();

  const configQuery = useQuery<QuoteConfigResponse>({
    queryKey: quoteConfigKeys.config(organizationId),
    queryFn: async (): Promise<QuoteConfigResponse> => {
      const response = await apiClient.get<QuoteConfigResponse>('/quote-calculator/config', {
        headers,
      });
      return response.data as QuoteConfigResponse;
    },
    staleTime: FIVE_MINUTES,
    enabled: !!organizationId,
  });

  const subsidyQuery = useQuery<SubsidyConfigResponse[]>({
    queryKey: quoteConfigKeys.subsidyRules(organizationId),
    queryFn: async (): Promise<SubsidyConfigResponse[]> => {
      const response = await apiClient.get<SubsidyConfigResponse[]>(
        '/quote-calculator/subsidy-rules/all',
        { headers },
      );
      return response.data as SubsidyConfigResponse[];
    },
    staleTime: FIVE_MINUTES,
    enabled: !!organizationId,
  });

  return {
    ...productOptions,
    quoteConfig: configQuery.data ?? null,
    subsidyConfigs: subsidyQuery.data ?? [],
    isLoading: productOptions.isLoading || configQuery.isLoading || subsidyQuery.isLoading,
    error:
      productOptions.error ?? configQuery.error?.message ?? subsidyQuery.error?.message ?? null,
  };
}

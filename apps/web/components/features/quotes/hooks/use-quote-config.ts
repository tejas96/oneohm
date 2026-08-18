'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { QuoteConfigResponse, SubsidyConfigResponse } from '../types';

import { apiClient } from '@/lib/api/client';
import { useProductOptions } from '@/lib/hooks/resources';
import { useProductTypeList, type ProductType } from '@/lib/hooks/resources/product-types';

function getAttributeOptions(
  productTypes: ProductType[],
  typeCode: string,
  attrKey: string,
): string[] {
  const pt = productTypes.find((t) => t.code === typeCode);
  const attr = pt?.attributes?.find((a) => a.attributeKey === attrKey);
  return (attr?.validation?.options as string[]) ?? [];
}

function toLabel(value: string): string {
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const PHASE_SUBTITLES: Record<string, string> = {
  single_phase: 'Up to 7 kW systems',
  three_phase: 'Above 7 kW systems',
};

// ============================================================================
// Query Keys (quote config + subsidy only — products use FDAL)
// ============================================================================

const quoteConfigKeys = {
  all: () => ['quote-config'] as const,
  config: (propertyId?: string) =>
    [...quoteConfigKeys.all(), 'config', propertyId ?? null] as const,
  subsidyRules: () => [...quoteConfigKeys.all(), 'subsidy-rules'] as const,
};

// ============================================================================
// Hook
// ============================================================================

const FIVE_MINUTES = 5 * 60 * 1000;

export interface PhaseTypeOption {
  value: string;
  label: string;
  subtitle?: string;
}

/**
 * @param propertyId Resolves the payment schedule against this property. A
 *   financed property returns the loan milestones (a smaller advance) rather
 *   than the self-financed default. Omitting it keeps the previous behaviour
 *   and always yields the self-financed schedule — which is what every quote
 *   used to save, financed or not, because the loan array was never
 *   serialised and this call never said which property it was for.
 */
export function useQuoteConfig(propertyId?: string) {
  const productOptions = useProductOptions();

  const { items: productTypes } = useProductTypeList({
    syncToUrl: false,
    defaultPageSize: 50,
  });

  const phaseTypeOptions: PhaseTypeOption[] = useMemo(() => {
    const options = getAttributeOptions(productTypes, 'inverter', 'phase_type');
    if (options.length === 0) {
      return [
        { value: 'single_phase', label: 'Single Phase', subtitle: 'Up to 7 kW systems' },
        { value: 'three_phase', label: 'Three Phase', subtitle: 'Above 7 kW systems' },
      ];
    }
    return options.map((v) => ({
      value: v,
      label: toLabel(v),
      subtitle: PHASE_SUBTITLES[v],
    }));
  }, [productTypes]);

  const configQuery = useQuery<QuoteConfigResponse>({
    queryKey: quoteConfigKeys.config(propertyId),
    queryFn: async (): Promise<QuoteConfigResponse> => {
      const response = await apiClient.get<QuoteConfigResponse>('/quote-calculator/config', {
        params: propertyId ? { propertyId } : undefined,
      });
      return response.data as QuoteConfigResponse;
    },
    staleTime: FIVE_MINUTES,
  });

  const subsidyQuery = useQuery<SubsidyConfigResponse[]>({
    queryKey: quoteConfigKeys.subsidyRules(),
    queryFn: async (): Promise<SubsidyConfigResponse[]> => {
      const response = await apiClient.get<SubsidyConfigResponse[]>(
        '/quote-calculator/subsidy-rules/all',
      );
      const rows = response.data as SubsidyConfigResponse[];
      return rows;
    },
    staleTime: FIVE_MINUTES,
  });

  return {
    ...productOptions,
    phaseTypeOptions,
    quoteConfig: configQuery.data ?? null,
    subsidyConfigs: subsidyQuery.data ?? [],
    isLoading: productOptions.isLoading || configQuery.isLoading || subsidyQuery.isLoading,
    error:
      productOptions.error ?? configQuery.error?.message ?? subsidyQuery.error?.message ?? null,
  };
}

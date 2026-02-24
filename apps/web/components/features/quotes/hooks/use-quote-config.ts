'use client';

import type { PanelTechnology } from '@oneohm-epc/shared-types';
import { useQueries } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import type { QuoteConfigResponse, SubsidyConfigResponse } from '../types';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';


// ============================================================================
// Types
// ============================================================================

interface ProductResponse {
  id: string;
  name: string;
  brand?: string;
  specifications?: {
    panel?: {
      wattage?: number;
      technology?: string;
      minWattage?: number;
      maxWattage?: number;
    };
    inverter?: {
      capacityKw?: number;
    };
    structure?: {
      structureType?: string;
      material?: string;
      costMultiplier?: number;
    };
  };
}

interface ProductsListResponse {
  data: ProductResponse[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface PanelTechnologyVariant {
  technology: PanelTechnology;
  wattageRange: string;
  minWattage: number;
  maxWattage: number;
  label: string;
}

export interface PanelBrandOption {
  value: string;
  label: string;
  wattageRange?: string;
  technologies: PanelTechnology[];
  technologyVariants: PanelTechnologyVariant[];
}

export interface InverterBrandOption {
  value: string;
  label: string;
  capacityRange?: string;
}

export interface StructureTypeOption {
  value: string;
  label: string;
  material?: string;
}

// ============================================================================
// Query Keys
// ============================================================================

const quoteConfigKeys = {
  all: (orgId?: string) => ['quote-config', orgId] as const,
  panelProducts: (orgId?: string) => [...quoteConfigKeys.all(orgId), 'panel-products'] as const,
  inverterProducts: (orgId?: string) => [...quoteConfigKeys.all(orgId), 'inverter-products'] as const,
  structureProducts: (orgId?: string) => [...quoteConfigKeys.all(orgId), 'structure-products'] as const,
  config: (orgId?: string) => [...quoteConfigKeys.all(orgId), 'config'] as const,
  subsidyRules: (orgId?: string) => [...quoteConfigKeys.all(orgId), 'subsidy-rules'] as const,
};

// ============================================================================
// Data derivation helpers
// ============================================================================

function derivePanelBrands(products: ProductResponse[]): PanelBrandOption[] {
  const brandMap = new Map<
    string,
    { wattages: number[]; variants: Map<string, { technology: string; minWattage: number; maxWattage: number; count: number }> }
  >();

  for (const product of products) {
    const brand = product.brand || 'Unknown';
    const wattage = product.specifications?.panel?.wattage || 0;
    const technology = product.specifications?.panel?.technology;
    const minWattage = product.specifications?.panel?.minWattage || wattage;
    const maxWattage = product.specifications?.panel?.maxWattage || wattage;

    if (!brandMap.has(brand)) {
      brandMap.set(brand, { wattages: [], variants: new Map() });
    }

    const info = brandMap.get(brand)!;
    if (wattage > 0) info.wattages.push(wattage);

    if (technology && minWattage && maxWattage) {
      const variantKey = `${technology}_${minWattage}_${maxWattage}`;
      if (!info.variants.has(variantKey)) {
        info.variants.set(variantKey, { technology, minWattage, maxWattage, count: 0 });
      }
      info.variants.get(variantKey)!.count += 1;
    }
  }

  const brands: PanelBrandOption[] = [];

  brandMap.forEach((info, name) => {
    const wattages = info.wattages.sort((a, b) => a - b);
    let wattageRange: string | undefined;
    if (wattages.length > 0) {
      const min = wattages[0];
      const max = wattages[wattages.length - 1];
      wattageRange = min === max ? `${min}W` : `${min}-${max}W`;
    }

    const technologyVariants: PanelTechnologyVariant[] = Array.from(info.variants.values())
      .map((v) => ({
        technology: v.technology as PanelTechnology,
        wattageRange: `${v.minWattage}-${v.maxWattage}Wp`,
        minWattage: v.minWattage,
        maxWattage: v.maxWattage,
        label: `${v.technology.toUpperCase()} ${v.minWattage}-${v.maxWattage}Wp`,
      }))
      .sort((a, b) => a.technology.localeCompare(b.technology) || a.minWattage - b.minWattage);

    const uniqueTechs = [...new Set(technologyVariants.map((v) => v.technology))];

    brands.push({
      value: name.toLowerCase(),
      label: name,
      wattageRange,
      technologies: uniqueTechs,
      technologyVariants,
    });
  });

  return brands.sort((a, b) => b.technologyVariants.length - a.technologyVariants.length);
}

function deriveInverterBrands(products: ProductResponse[]): InverterBrandOption[] {
  const brandMap = new Map<string, number[]>();

  for (const product of products) {
    const brand = product.brand || 'Unknown';
    const capacity = product.specifications?.inverter?.capacityKw || 0;

    if (!brandMap.has(brand)) brandMap.set(brand, []);
    if (capacity > 0) brandMap.get(brand)!.push(capacity);
  }

  const brands: InverterBrandOption[] = [];

  brandMap.forEach((capacities, name) => {
    const sorted = capacities.sort((a, b) => a - b);
    let capacityRange: string | undefined;
    if (sorted.length > 0) {
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      capacityRange = min === max ? `${min}KW` : `${min}-${max}KW`;
    }
    brands.push({ value: name.toLowerCase(), label: name, capacityRange });
  });

  return brands.sort((a, b) => a.label.localeCompare(b.label));
}

function deriveStructureTypes(products: ProductResponse[]): StructureTypeOption[] {
  const structureMap = new Map<string, StructureTypeOption>();

  for (const product of products) {
    const st = product.specifications?.structure?.structureType;
    if (st && !structureMap.has(st)) {
      structureMap.set(st, {
        value: st,
        label: product.name,
        material: product.specifications?.structure?.material,
      });
    }
  }

  return Array.from(structureMap.values());
}

// ============================================================================
// Hook
// ============================================================================

const FIVE_MINUTES = 5 * 60 * 1000;

export function useQuoteConfig() {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  const headers = useMemo(
    () => ({ 'X-Organization-Id': organizationId }),
    [organizationId],
  );

  const results = useQueries({
    queries: [
      {
        queryKey: quoteConfigKeys.panelProducts(organizationId),
        queryFn: async () => {
          const { data } = await apiClient.get<ProductsListResponse>('/products', {
            params: { type: 'solar_panel', status: 'active', limit: 500 },
            headers,
          });
          return data.data;
        },
        staleTime: FIVE_MINUTES,
        enabled: !!organizationId,
      },
      {
        queryKey: quoteConfigKeys.inverterProducts(organizationId),
        queryFn: async () => {
          const { data } = await apiClient.get<ProductsListResponse>('/products', {
            params: { type: 'inverter', status: 'active', limit: 500 },
            headers,
          });
          return data.data;
        },
        staleTime: FIVE_MINUTES,
        enabled: !!organizationId,
      },
      {
        queryKey: quoteConfigKeys.structureProducts(organizationId),
        queryFn: async () => {
          const { data } = await apiClient.get<ProductsListResponse>('/products', {
            params: { type: 'mounting_structure', status: 'active', limit: 100 },
            headers,
          });
          return data.data;
        },
        staleTime: FIVE_MINUTES,
        enabled: !!organizationId,
      },
      {
        queryKey: quoteConfigKeys.config(organizationId),
        queryFn: async () => {
          const { data } = await apiClient.get<QuoteConfigResponse>(
            '/quote-calculator/config',
            { headers },
          );
          return data;
        },
        staleTime: FIVE_MINUTES,
        enabled: !!organizationId,
      },
      {
        queryKey: quoteConfigKeys.subsidyRules(organizationId),
        queryFn: async () => {
          const { data } = await apiClient.get<SubsidyConfigResponse[]>(
            '/quote-calculator/subsidy-rules/all',
            { headers },
          );
          return data;
        },
        staleTime: FIVE_MINUTES,
        enabled: !!organizationId,
      },
    ],
  });

  const [panelsQuery, invertersQuery, structuresQuery, configQuery, subsidyQuery] = results;

  const isLoading = results.some((r) => r.isLoading);
  const error = results.find((r) => r.error)?.error?.message ?? null;

  const panelBrands = useMemo(
    () => derivePanelBrands(panelsQuery.data ?? []),
    [panelsQuery.data],
  );

  const inverterBrands = useMemo(
    () => deriveInverterBrands(invertersQuery.data ?? []),
    [invertersQuery.data],
  );

  const structureTypes = useMemo(
    () => deriveStructureTypes(structuresQuery.data ?? []),
    [structuresQuery.data],
  );

  const getTechnologyVariantsForBrand = useCallback(
    (brandValue: string): PanelTechnologyVariant[] => {
      const brand = panelBrands.find((b) => b.value === brandValue);
      return brand?.technologyVariants ?? [];
    },
    [panelBrands],
  );

  return {
    isLoading,
    error,
    panelBrands,
    inverterBrands,
    structureTypes,
    quoteConfig: configQuery.data ?? null,
    subsidyConfigs: subsidyQuery.data ?? [],
    getTechnologyVariantsForBrand,
  };
}

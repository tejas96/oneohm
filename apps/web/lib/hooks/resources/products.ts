'use client';

import {
  type ProductOptionInput,
  type PanelBrandOption,
  type InverterBrandOption,
  type StructureTypeOption,
  type PanelTechnologyVariant,
  type InverterCapacityOption,
  derivePanelBrands,
  deriveInverterBrands,
  deriveStructureTypes,
  getInverterCapacities as getInverterCapacitiesUtil,
} from '@oneohm-epc/shared-types';
import { useCallback, useMemo } from 'react';

import { useResourceList, STALE_TIMES, type BaseFilters } from '../core';

// ── Types ──────────────────────────────────────────────────────

export type { ProductOptionInput as ProductItem };
export type {
  PanelBrandOption,
  InverterBrandOption,
  StructureTypeOption,
  PanelTechnologyVariant,
  InverterCapacityOption,
};

interface ProductListFilters extends BaseFilters {
  type?: string;
  status?: string;
}

// ── Fetch-All Hooks (no pagination, no URL sync) ───────────────

export function useAllPanelProducts() {
  return useResourceList<ProductOptionInput, ProductListFilters>({
    resource: 'products-panels',
    endpoint: '/products',
    defaultPageSize: 500,
    syncToUrl: false,
    staleTime: STALE_TIMES.slow,
    defaultFilters: { type: 'solar_panel', status: 'active' } as Partial<ProductListFilters>,
  });
}

export function useAllInverterProducts() {
  return useResourceList<ProductOptionInput, ProductListFilters>({
    resource: 'products-inverters',
    endpoint: '/products',
    defaultPageSize: 500,
    syncToUrl: false,
    staleTime: STALE_TIMES.slow,
    defaultFilters: { type: 'inverter', status: 'active' } as Partial<ProductListFilters>,
  });
}

export function useAllStructureProducts() {
  return useResourceList<ProductOptionInput, ProductListFilters>({
    resource: 'products-structures',
    endpoint: '/products',
    defaultPageSize: 500,
    syncToUrl: false,
    staleTime: STALE_TIMES.slow,
    defaultFilters: { type: 'mounting_structure', status: 'active' } as Partial<ProductListFilters>,
  });
}

// ── Composite Hook ─────────────────────────────────────────────

export function useProductOptions() {
  const panels = useAllPanelProducts();
  const inverters = useAllInverterProducts();
  const structures = useAllStructureProducts();

  const panelBrands = useMemo(
    () => derivePanelBrands(panels.items),
    [panels.items],
  );

  const inverterBrands = useMemo(
    () => deriveInverterBrands(inverters.items),
    [inverters.items],
  );

  const structureTypes = useMemo(
    () => deriveStructureTypes(structures.items),
    [structures.items],
  );

  const getTechnologyVariantsForBrand = useCallback(
    (brandValue: string): PanelTechnologyVariant[] => {
      const brand = panelBrands.find((b) => b.value === brandValue);
      return brand?.technologyVariants ?? [];
    },
    [panelBrands],
  );

  const getInverterCapacities = useCallback(
    (phaseType?: string, brand?: string): InverterCapacityOption[] => {
      return getInverterCapacitiesUtil(inverters.items, phaseType, brand);
    },
    [inverters.items],
  );

  return {
    isLoading: panels.isLoading || inverters.isLoading || structures.isLoading,
    error: panels.error?.message ?? inverters.error?.message ?? structures.error?.message ?? null,
    panelBrands,
    inverterBrands,
    structureTypes,
    getTechnologyVariantsForBrand,
    getInverterCapacities,
  };
}

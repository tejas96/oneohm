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
} from '@tejas96/shared/utils';
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
  hasActivePrice?: boolean;
}

// ── Fetch-All Hooks (no pagination, no URL sync) ───────────────

/*
  `hasActivePrice` BELONGS ON ALL THREE OF THESE, not on structures alone.

  It was asked for on structures and nowhere else, so the inverter list carried
  three DEYE units — 1 kW, 2 kW and 3 kW on-grid — with no active price behind
  them: 61 offered where 58 could be quoted. Choosing one produced a refusal
  from the calculator with no visible cause, because everything the rep could
  see about the product looked normal.

  These two hooks feed `useProductOptions` and nothing else, and that feeds the
  quote builder alone — so this narrows the picker without touching any admin or
  inventory screen, which reach for products through their own hooks.

  Panels are unaffected in the current catalogue (22 either way) and are filtered
  anyway: the bug is the missing rule, not the rows it happens to drop today.
*/
export function useAllPanelProducts() {
  return useResourceList<ProductOptionInput, ProductListFilters>({
    resource: 'products-panels',
    endpoint: '/products',
    defaultPageSize: 500,
    syncToUrl: false,
    staleTime: STALE_TIMES.slow,
    defaultFilters: {
      type: 'solar_panel',
      status: 'active',
      hasActivePrice: true,
    } as Partial<ProductListFilters>,
  });
}

export function useAllInverterProducts() {
  return useResourceList<ProductOptionInput, ProductListFilters>({
    resource: 'products-inverters',
    endpoint: '/products',
    defaultPageSize: 500,
    syncToUrl: false,
    staleTime: STALE_TIMES.slow,
    defaultFilters: {
      type: 'inverter',
      status: 'active',
      hasActivePrice: true,
    } as Partial<ProductListFilters>,
  });
}

export function useAllStructureProducts() {
  return useResourceList<ProductOptionInput, ProductListFilters>({
    resource: 'products-structures',
    endpoint: '/products',
    defaultPageSize: 500,
    syncToUrl: false,
    staleTime: STALE_TIMES.slow,
    defaultFilters: {
      type: 'mounting_structure',
      status: 'active',
      hasActivePrice: true,
    } as Partial<ProductListFilters>,
  });
}

/** All mounting structure products (active + inactive) for admin structure type picker */
export function useAllMountingStructureProductsForAdmin() {
  return useResourceList<ProductOptionInput, ProductListFilters>({
    resource: 'products-structures-admin',
    endpoint: '/products',
    defaultPageSize: 500,
    syncToUrl: false,
    staleTime: STALE_TIMES.slow,
    defaultFilters: { type: 'mounting_structure' } as Partial<ProductListFilters>,
  });
}

// ── Composite Hook ─────────────────────────────────────────────

export function useProductOptions() {
  const panels = useAllPanelProducts();
  const inverters = useAllInverterProducts();
  const structures = useAllStructureProducts();

  const panelBrands = useMemo(() => derivePanelBrands(panels.items), [panels.items]);

  const inverterBrands = useMemo(() => deriveInverterBrands(inverters.items), [inverters.items]);

  const structureTypes = useMemo(() => deriveStructureTypes(structures.items), [structures.items]);

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

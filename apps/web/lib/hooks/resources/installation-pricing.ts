'use client';

import { type InstallationCostComponents } from '@tejas96/shared/types';

import {
  type BaseFilters,
  defineResource,
  getResourceConfig,
  getResourceAccess,
  getResourcePermissions,
  STALE_TIMES,
  useResourceList,
  useResourceMutations,
  useResourcePermissions,
  type ResourceConfig,
} from '../core';

export interface InstallationPricingItem {
  id: string;
  organizationId: string;
  minSystemSizeKw: number;
  maxSystemSizeKw: number | null;
  transportRatePerKm: number;
  floorIncrementPercent: number;
  gstRate: number;
  costComponents: InstallationCostComponents;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InstallationPricingFilters extends BaseFilters {
  isActive?: boolean;
}

defineResource<InstallationPricingItem>(
  'installation-pricing',
  {
    endpoint: '/installation-pricing',
    defaultPageSize: 100,
    searchDebounceMs: 500,
    syncToUrl: true,
    staleTime: STALE_TIMES.slow,
    defaultSort: { field: 'minSystemSizeKw', order: 'ASC' },
  },
  {
    view: 'installation-pricing:read',
    create: 'installation-pricing:create',
    update: 'installation-pricing:update',
    delete: 'installation-pricing:delete',
  },
  {
    view: 'admin.catalog.manage',
    create: 'admin.catalog.manage',
    update: 'admin.catalog.manage',
    delete: 'admin.catalog.manage',
  },
);

export function useInstallationPricing() {
  const config = getResourceConfig('installation-pricing') as ResourceConfig<
    InstallationPricingItem,
    InstallationPricingFilters
  >;
  return useResourceList<InstallationPricingItem, InstallationPricingFilters>(config);
}

export function useInstallationPricingMutations() {
  return useResourceMutations<InstallationPricingItem>({
    resource: 'installation-pricing',
    endpoint: '/installation-pricing',
    toast: {
      create: { success: 'Pricing tier created', error: 'Failed to create pricing tier' },
      update: { success: 'Pricing tier updated', error: 'Failed to update pricing tier' },
      delete: { success: 'Pricing tier deleted', error: 'Failed to delete pricing tier' },
    },
  });
}

export function useInstallationPricingPermissions() {
  return useResourcePermissions(getResourcePermissions('installation-pricing'), getResourceAccess('installation-pricing'));
}

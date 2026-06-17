'use client';

import { ProjectType, SubsidySchemeType, type SubsidyTier } from '@tejas96/shared/types';

import {
  type BaseFilters,
  defineResource,
  getResourceConfig,
  getResourcePermissions,
  STALE_TIMES,
  useResourceList,
  useResourceMutations,
  useResourcePermissions,
  type ResourceConfig,
} from '../core';

export interface SubsidyConfigItem {
  id: string;
  organizationId: string;
  schemeName: string;
  schemeCode?: string;
  schemeType: SubsidySchemeType;
  projectType: ProjectType;
  maxSubsidyKw: number;
  maxSubsidyAmount?: number;
  requiresDcr: boolean;
  autoSplitEnabled: boolean;
  tiers: SubsidyTier[];
  isActive: boolean;
  description?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubsidyConfigFilters extends BaseFilters {
  projectType?: ProjectType;
  isActive?: boolean;
}

defineResource<SubsidyConfigItem>(
  'subsidy-config',
  {
    endpoint: '/subsidy-configurations',
    defaultPageSize: 20,
    searchDebounceMs: 500,
    syncToUrl: true,
    staleTime: STALE_TIMES.slow,
    defaultSort: { field: 'schemeName', order: 'ASC' },
  },
  {
    view: 'subsidy-config:read',
    create: 'subsidy-config:create',
    update: 'subsidy-config:update',
    delete: 'subsidy-config:delete',
  },
);

export function useSubsidyConfigList() {
  const config = getResourceConfig('subsidy-config') as ResourceConfig<
    SubsidyConfigItem,
    SubsidyConfigFilters
  >;
  return useResourceList<SubsidyConfigItem, SubsidyConfigFilters>(config);
}

export function useSubsidyConfigMutations() {
  return useResourceMutations<SubsidyConfigItem>({
    resource: 'subsidy-config',
    endpoint: '/subsidy-configurations',
    toast: {
      create: { success: 'Subsidy rule created', error: 'Failed to create subsidy rule' },
      update: { success: 'Subsidy rule updated', error: 'Failed to update subsidy rule' },
      delete: { success: 'Subsidy rule deleted', error: 'Failed to delete subsidy rule' },
    },
  });
}

export function useSubsidyConfigPermissions() {
  return useResourcePermissions(getResourcePermissions('subsidy-config'));
}

'use client';

import type { GstConfig, PaymentMilestoneConfig, ProfitMarginTier } from '@tejas96/shared/types';

import { defineResource, useResourceDetail, useResourceMutations } from '../core';

export interface QuoteConfig {
  id: string;
  organizationId: string;
  defaultValidityDays: number;
  maxVersions: number;
  defaultCompletionWeeks: number;
  gstConfig: GstConfig;
  paymentMilestones: PaymentMilestoneConfig[];
  profitMarginTiers: ProfitMarginTier[];
  showInventoryStock: boolean;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

defineResource<QuoteConfig>(
  'quote-config',
  {
    endpoint: '/quote-configurations',
    syncToUrl: false,
  },
  undefined,
  {
    view: 'admin.catalog.manage',
    update: 'admin.catalog.manage',
  },
);

export function useQuoteConfig() {
  return useResourceDetail<QuoteConfig>({
    resource: 'quote-config',
    endpoint: '/quote-configurations',
    id: 'active',
  });
}

export function useQuoteConfigMutations() {
  return useResourceMutations<QuoteConfig>({
    resource: 'quote-config',
    endpoint: '/quote-configurations',
    toast: {
      update: { success: 'Quote configuration saved', error: 'Failed to save quote configuration' },
    },
  });
}

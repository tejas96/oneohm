'use client';

import {
  type ConnectionType,
  type LeadTemperature,
  type PropertyDocument,
  type PropertyStatus,
  type PropertyType,
  type QuoteStatus,
} from '@tejas96/shared/types';

import { defineResource, useResourceMutations, type BaseFilters } from '../core';

import type { DiscomResponse } from '@/components/features/properties/hooks/use-discoms';

// ── Types ──────────────────────────────────────────────────────

export interface PropertyItem {
  id: string;
  customerId: string;
  organizationId: string;
  propertyCode?: string;
  propertyName?: string;
  propertyType: PropertyType;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  consumerNumber?: string;
  consumerName?: string;
  currentLoad?: string;
  discomId?: string;
  discom?: DiscomResponse;
  connectionType?: ConnectionType;
  sanctionedLoad?: number;
  meterNumber?: string;
  leadTemperature: LeadTemperature;
  isPrimary: boolean;
  wantsLoan: boolean;
  status: PropertyStatus;
  notes?: string;
  documents?: PropertyDocument[];
  siteStatus?: string;
  siteVisitDone?: boolean;
  surveyDone?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  customerName?: string;
  customerPhone?: string;
  creatorName?: string;
  latestQuoteNumber?: string;
  latestQuoteStatus?: QuoteStatus;
  latestQuoteDate?: string;
  latestQuoteFinalPrice?: number;
  latestQuoteSystemSizeKw?: number;
}

export interface PropertyListFilters extends BaseFilters {
  leadTemperature?: string;
  propertyType?: string;
  status?: string;
  city?: string;
  state?: string;
  createdBy?: string;
  fromDate?: string;
  toDate?: string;
  siteStatus?: string;
}

// ── Resource Registration (kept for usePropertyMutations) ────────

defineResource<PropertyItem>('properties', {
  endpoint: '/customer-properties',
  defaultPageSize: 10,
  searchDebounceMs: 550,
  minSearchLength: 2,
  syncToUrl: true,
});

// ── Hooks ──────────────────────────────────────────────────────

export function usePropertyMutations(): ReturnType<typeof useResourceMutations<PropertyItem>> {
  return useResourceMutations<PropertyItem>({
    resource: 'properties',
    endpoint: '/customer-properties',
    toast: {
      update: { success: 'Property updated', error: 'Failed to update property' },
      delete: { success: 'Property deleted', error: 'Failed to delete property' },
    },
  });
}

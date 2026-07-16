'use client';

import {
  type ConnectionType,
  type LeadTemperature,
  type PropertyDocument,
  PropertySortField,
  type PropertyStatus,
  type PropertyType,
  type QuoteStatus,
} from '@tejas96/shared/types';

import {
  defineResource,
  getResourceConfig,
  useResourceList,
  useResourceMutations,
  useResourceStats,
  type ResourceConfig,
  type BaseFilters,
} from '../core';

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
  discomName?: string;
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

// ── Resource Registration ──────────────────────────────────────

defineResource<PropertyItem>('properties', {
  endpoint: '/customer-properties',
  defaultPageSize: 10,
  searchDebounceMs: 550,
  minSearchLength: 2,
  syncToUrl: true,
  defaultSort: { field: PropertySortField.CREATED_AT, order: 'DESC' },
  defaultFilters: {
    leadTemperature: 'all',
    propertyType: 'all',
  } as Partial<PropertyListFilters>,
});

// ── Hooks ──────────────────────────────────────────────────────

export function usePropertyList(): ReturnType<
  typeof useResourceList<PropertyItem, PropertyListFilters>
> {
  const config = getResourceConfig('properties') as ResourceConfig<
    PropertyItem,
    PropertyListFilters
  >;
  return useResourceList<PropertyItem, PropertyListFilters>(config);
}

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

export function usePropertyTemperatureStats(): ReturnType<typeof useResourceStats> {
  return useResourceStats({
    resource: 'properties',
    endpoint: '/customer-properties/statistics/temperature',
  });
}

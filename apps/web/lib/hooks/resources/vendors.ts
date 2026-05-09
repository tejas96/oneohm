'use client';

import {
  createResourceKeys,
  defineResource,
  useResourceDetail,
  useResourceList,
  useResourceMutations,
  useResourceStats,
  type BaseFilters,
  type ResourceConfig,
} from '../core';

// ============================================================================
// Types
// ============================================================================

export interface Vendor {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  vendorType: string;
  status: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  gstin?: string;
  pan?: string;
  paymentTerms?: string;
  creditDays?: number;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  rating?: number;
  notes?: string;
  totalOrders?: number;
  createdAt: string;
  updatedAt: string;
}

export interface VendorFilters extends BaseFilters {
  status?: string;
  vendorType?: string;
}

// ============================================================================
// Registry
// ============================================================================

defineResource<Vendor>(
  'vendors',
  {
    endpoint: '/vendors',
    defaultPageSize: 20,
    syncToUrl: true,
    defaultSort: { field: 'name', order: 'ASC' },
  },
  {
    view: 'inventory:read',
    create: 'inventory:write',
    update: 'inventory:write',
    delete: 'inventory:write',
  },
);

// ============================================================================
// Query keys
// ============================================================================

export const vendorKeys = createResourceKeys('vendors');

// ============================================================================
// Hooks
// ============================================================================

export function useVendors(overrides?: Partial<ResourceConfig<Vendor, VendorFilters>>) {
  return useResourceList<Vendor, VendorFilters>({
    resource: 'vendors',
    endpoint: '/vendors',
    defaultPageSize: 20,
    syncToUrl: true,
    ...overrides,
  });
}

export function useVendor(id: string) {
  return useResourceDetail<Vendor>({
    resource: 'vendors',
    endpoint: '/vendors',
    id,
  });
}

export function useVendorMutations() {
  return useResourceMutations<Vendor>({
    resource: 'vendors',
    endpoint: '/vendors',
    customActions: {
      changeStatus: {
        method: 'PATCH',
        path: (id) => `/vendors/${id}/status`,
      },
      updateRating: {
        method: 'PATCH',
        path: (id) => `/vendors/${id}/rating`,
      },
    },
    toast: {
      create: { success: 'Vendor created', error: 'Failed to create vendor' },
      update: { success: 'Vendor updated', error: 'Failed to update vendor' },
      delete: { success: 'Vendor deleted', error: 'Failed to delete vendor' },
      changeStatus: { success: 'Status updated', error: 'Failed to update status' },
      updateRating: { success: 'Rating updated', error: 'Failed to update rating' },
    },
  });
}

export function useVendorStats() {
  return useResourceStats({
    resource: 'vendors',
    endpoint: '/vendors/stats/summary',
  });
}

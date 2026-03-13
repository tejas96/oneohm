'use client';

import type {
  ConnectionType,
  LeadTemperature,
  PropertyDocument,
  PropertySortField,
  PropertyStatus,
  PropertyType,
  QuoteStatus,
  SortOrder,
} from '@oneohm-epc/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { customerKeys, propertyKeys } from './use-create-property';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

// ============================================================================
// Types (kept for backward compatibility with detail/form pages)
// ============================================================================

export interface PropertyFilters {
  page?: number;
  limit?: number;
  search?: string;
  leadTemperature?: LeadTemperature;
  propertyType?: PropertyType;
  status?: PropertyStatus;
  city?: string;
  state?: string;
  createdBy?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: PropertySortField;
  sortOrder?: SortOrder;
}

export interface Property {
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
  monthlyBill?: number;
  leadTemperature: LeadTemperature;
  isPrimary: boolean;
  wantsLoan: boolean;
  status: PropertyStatus;
  notes?: string;
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

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PropertyListResponse {
  data: Property[];
  meta: PaginationMeta;
}

export interface PropertyStatsResponse {
  hot: number;
  warm: number;
  cold: number;
}

export interface UpdatePropertyData {
  propertyName?: string;
  propertyType?: PropertyType;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  consumerNumber?: string;
  discomName?: string;
  connectionType?: ConnectionType;
  sanctionedLoad?: number;
  meterNumber?: string;
  monthlyBill?: number;
  leadTemperature?: LeadTemperature;
  wantsLoan?: boolean;
  status?: PropertyStatus;
  notes?: string;
  isPrimary?: boolean;
  documents?: PropertyDocument[];
}

// ============================================================================
// Hooks (update & delete kept for detail/form pages)
// ============================================================================

/**
 * Hook to update a property
 * Invalidates list and detail query keys on success
 */
export function useUpdateProperty(): UseMutationResult<
  Property,
  AxiosError,
  { id: string; data: UpdatePropertyData }
> {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdatePropertyData;
    }): Promise<Property> => {
      const { data: response } = await apiClient.patch<Property>(
        `/customer-properties/${id}`,
        data,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: propertyKeys.all(organizationId) });
      void queryClient.invalidateQueries({
        queryKey: customerKeys.lists(organizationId),
      });
    },
  });
}

/**
 * Hook to delete a property (soft delete)
 */
export function useDeleteProperty(): UseMutationResult<void, AxiosError, string> {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/customer-properties/${id}`, {
        headers: { 'X-Organization-Id': organizationId },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: propertyKeys.all(organizationId) });
      void queryClient.invalidateQueries({
        queryKey: customerKeys.lists(organizationId),
      });
    },
  });
}

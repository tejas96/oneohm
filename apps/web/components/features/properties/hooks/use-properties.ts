'use client';

import type {
  ConnectionType,
  LeadTemperature,
  PaginationMeta,
  PropertyDocument,
  PropertySortField,
  PropertyStatus,
  PropertyType,
  QuoteStatus,
  SortOrder,
} from '@oneohm-epc/shared/types';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
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
  connectionType?: ConnectionType;
  city?: string;
  state?: string;
  createdBy?: string;
  fromDate?: string;
  toDate?: string;
  quoteStatus?: QuoteStatus;
  systemSizeMin?: number;
  systemSizeMax?: number;
  sortBy?: PropertySortField;
  sortOrder?: SortOrder;
  enabled?: boolean;
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
  customerEmail?: string;
  creatorName?: string;
  latestQuoteId?: string;
  latestQuoteNumber?: string;
  latestQuoteStatus?: QuoteStatus;
  latestQuoteDate?: string;
  latestQuoteFinalPrice?: number;
  latestQuoteSystemSizeKw?: number;
}

export type { PaginationMeta };

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

/**
 * Hook to list properties with server-side pagination, sorting, filtering and search.
 * Used by PropertyListPage (AdvancedTable controlled pattern).
 * Mirrors the useCustomers hook structure exactly.
 */
export function useProperties(
  filters: PropertyFilters = {},
): UseQueryResult<PropertyListResponse, AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: propertyKeys.list(organizationId, filters as Record<string, unknown>),
    queryFn: async (): Promise<PropertyListResponse> => {
      const params = new URLSearchParams();

      // Pagination
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));

      // Search — backend @MinLength(2) rejects shorter strings
      if (filters.search && filters.search.length >= 2) {
        params.append('search', filters.search);
      }

      // Filters — omit undefined/empty; 'all' is stripped by toPropertyFilters before calling here
      if (filters.leadTemperature) params.append('leadTemperature', filters.leadTemperature);
      if (filters.propertyType) params.append('propertyType', filters.propertyType);
      if (filters.status) params.append('status', filters.status);
      if (filters.connectionType) params.append('connectionType', filters.connectionType);
      if (filters.city) params.append('city', filters.city);
      if (filters.state) params.append('state', filters.state);
      if (filters.createdBy) params.append('createdBy', filters.createdBy);
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);
      if (filters.quoteStatus) params.append('quoteStatus', filters.quoteStatus);
      if (filters.systemSizeMin !== undefined)
        params.append('systemSizeMin', String(filters.systemSizeMin));
      if (filters.systemSizeMax !== undefined)
        params.append('systemSizeMax', String(filters.systemSizeMax));

      // Sorting
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const { data } = await apiClient.get<PropertyListResponse>(
        `/customer-properties?${params.toString()}`,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    enabled: !!organizationId && filters.enabled !== false,
  });
}

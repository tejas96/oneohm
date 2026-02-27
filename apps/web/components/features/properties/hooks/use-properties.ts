'use client';

import {
  LeadTemperature,
  PropertySortField,
  PropertyStatus,
  PropertyType,
  SortOrder,
  type ConnectionType,
  type QuoteStatus,
} from '@oneohm-epc/shared-types';
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { propertyKeys } from './use-create-property';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

// ============================================================================
// Types
// ============================================================================

/**
 * Property filters for the list API
 * Supports pagination, search, filtering, and sorting
 */
export interface PropertyFilters {
  // Pagination
  page?: number;
  limit?: number;
  // Search
  search?: string;
  // Filters
  leadTemperature?: LeadTemperature;
  propertyType?: PropertyType;
  status?: PropertyStatus;
  city?: string;
  state?: string;
  createdBy?: string;
  fromDate?: string;
  toDate?: string;
  // Sorting
  sortBy?: PropertySortField;
  sortOrder?: SortOrder;
}

/**
 * Property list item type
 * Matches backend CustomerPropertyResponseDto with enriched fields
 */
export interface Property {
  id: string;
  customerId: string;
  organizationId: string;
  // Property Details
  propertyName?: string;
  propertyType: PropertyType;
  // Address
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  // Electricity/Consumer Details
  consumerNumber?: string;
  consumerName?: string;
  currentLoad?: string;
  discomName?: string;
  connectionType?: ConnectionType;
  sanctionedLoad?: number;
  meterNumber?: string;
  // Site Details
  monthlyBill?: number;
  // Lead Tracking
  leadTemperature: LeadTemperature;
  // Flags
  isPrimary: boolean;
  wantsLoan: boolean;
  // Status
  status: PropertyStatus;
  // Notes
  notes?: string;
  // Audit Fields
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  // Enriched: customer info
  customerName?: string;
  customerPhone?: string;
  // Enriched: creator info
  creatorName?: string;
  // Enriched: quote info
  latestQuoteNumber?: string;
  latestQuoteStatus?: QuoteStatus;
  latestQuoteDate?: string;
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
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch paginated properties with filters, sorting, and search
 * Supports all query parameters from PropertyQueryDto
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

      // Search (min 2 chars)
      if (filters.search && filters.search.length >= 2) {
        params.append('search', filters.search);
      }

      // Filters
      if (filters.leadTemperature) params.append('leadTemperature', filters.leadTemperature);
      if (filters.propertyType) params.append('propertyType', filters.propertyType);
      if (filters.status) params.append('status', filters.status);
      if (filters.city) params.append('city', filters.city);
      if (filters.state) params.append('state', filters.state);
      if (filters.createdBy) params.append('createdBy', filters.createdBy);
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);

      // Sorting
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const { data } = await apiClient.get<PropertyListResponse>(
        `/customer-properties?${params.toString()}`,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    enabled: !!organizationId,
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to fetch property temperature statistics
 * Used for FilterTabs counts (All | Hot | Warm | Cold)
 */
export function usePropertyStats(): UseQueryResult<PropertyStatsResponse, AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: [...propertyKeys.all(organizationId), 'stats', 'temperature'],
    queryFn: async (): Promise<PropertyStatsResponse> => {
      const { data } = await apiClient.get<PropertyStatsResponse>(
        '/customer-properties/statistics/temperature',
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    enabled: !!organizationId,
  });
}

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
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: propertyKeys.lists(organizationId) });
      void queryClient.invalidateQueries({
        queryKey: propertyKeys.detail(organizationId, variables.id),
      });
      void queryClient.invalidateQueries({
        queryKey: [...propertyKeys.all(organizationId), 'stats'],
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
      void queryClient.invalidateQueries({ queryKey: propertyKeys.lists(organizationId) });
      void queryClient.invalidateQueries({
        queryKey: [...propertyKeys.all(organizationId), 'stats'],
      });
    },
  });
}

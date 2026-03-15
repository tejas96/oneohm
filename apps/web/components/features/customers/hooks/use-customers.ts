'use client';

import {
  CustomerSortField,
  CustomerStatus,
  LeadSource,
  type PaginationMeta,
  SortOrder,
} from '@oneohm-epc/shared/types';
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { customerKeys } from './use-create-customer';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

// ============================================================================
// Types
// ============================================================================

/**
 * Customer filters for the list API
 * Supports pagination, search, filtering, and sorting
 */
export interface CustomerFilters {
  // Pagination
  page?: number;
  limit?: number;
  // Search
  search?: string;
  // Filters
  status?: CustomerStatus;
  city?: string;
  state?: string;
  leadSource?: LeadSource;
  createdBy?: string; // 'me' for field workers or actual userId
  fromDate?: string; // ISO date string (YYYY-MM-DD)
  toDate?: string; // ISO date string (YYYY-MM-DD)
  // Sorting
  sortBy?: CustomerSortField;
  sortOrder?: SortOrder;
}

export interface Customer {
  id: string;
  organizationId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  leadSource?: string;
  referralCode?: string;
  status: CustomerStatus;
  propertyCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  creatorName?: string;
}

export type { PaginationMeta };

export interface CustomerListResponse {
  data: Customer[];
  meta: PaginationMeta;
}

export interface CustomerStatsResponse {
  lead: number;
  prospect: number;
  active: number;
  inactive: number;
}

export interface UpdateCustomerData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  leadSource?: string;
  referralCode?: string;
  status?: CustomerStatus;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch paginated customers with filters, sorting, and search
 * Supports all query parameters from CustomerQueryDto
 */
export function useCustomers(
  filters: CustomerFilters = {},
): UseQueryResult<CustomerListResponse, AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: customerKeys.list(organizationId, filters as Record<string, unknown>),
    queryFn: async (): Promise<CustomerListResponse> => {
      const params = new URLSearchParams();

      // Pagination
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));

      // Search (min 2 chars)
      if (filters.search && filters.search.length >= 2) {
        params.append('search', filters.search);
      }

      // Filters
      if (filters.status) params.append('status', filters.status);
      if (filters.city) params.append('city', filters.city);
      if (filters.state) params.append('state', filters.state);
      if (filters.leadSource) params.append('leadSource', filters.leadSource);
      if (filters.createdBy) params.append('createdBy', filters.createdBy);
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);

      // Sorting
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const { data } = await apiClient.get<CustomerListResponse>(
        `/customers?${params.toString()}`,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    enabled: !!organizationId,
    // Keep previous data visible while new data loads to prevent UI flicker
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to fetch a single customer by ID
 */
export function useCustomer(id: string): UseQueryResult<Customer, AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: customerKeys.detail(organizationId, id),
    queryFn: async (): Promise<Customer> => {
      const { data } = await apiClient.get<Customer>(`/customers/${id}`, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return data;
    },
    enabled: !!id && !!organizationId,
  });
}

/**
 * Hook to fetch customer status statistics
 */
export function useCustomerStats(): UseQueryResult<CustomerStatsResponse, AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: [...customerKeys.all(organizationId), 'stats'] as const,
    queryFn: async (): Promise<CustomerStatsResponse> => {
      const { data } = await apiClient.get<CustomerStatsResponse>('/customers/statistics/status', {
        headers: { 'X-Organization-Id': organizationId },
      });
      return data;
    },
    enabled: !!organizationId,
  });
}

/**
 * Hook to update a customer
 */
export function useUpdateCustomer(): UseMutationResult<
  Customer,
  AxiosError,
  { id: string; data: UpdateCustomerData }
> {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async ({ id, data }): Promise<Customer> => {
      const { data: response } = await apiClient.patch<Customer>(`/customers/${id}`, data, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return response;
    },
    onSuccess: (updatedCustomer) => {
      queryClient.setQueryData(
        customerKeys.detail(organizationId, updatedCustomer.id),
        updatedCustomer,
      );
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists(organizationId) });
      void queryClient.invalidateQueries({
        queryKey: [...customerKeys.all(organizationId), 'stats'],
      });
    },
  });
}

/**
 * Hook to update customer status
 */
export function useUpdateCustomerStatus(): UseMutationResult<
  Customer,
  AxiosError,
  { id: string; status: CustomerStatus }
> {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async ({ id, status }): Promise<Customer> => {
      const { data: response } = await apiClient.post<Customer>(
        `/customers/${id}/status`,
        { status },
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return response;
    },
    onSuccess: (updatedCustomer) => {
      queryClient.setQueryData(
        customerKeys.detail(organizationId, updatedCustomer.id),
        updatedCustomer,
      );
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists(organizationId) });
      void queryClient.invalidateQueries({
        queryKey: [...customerKeys.all(organizationId), 'stats'],
      });
    },
  });
}

/**
 * Hook to delete a customer
 */
export function useDeleteCustomer(): UseMutationResult<void, AxiosError, string> {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/customers/${id}`, {
        headers: { 'X-Organization-Id': organizationId },
      });
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: customerKeys.detail(organizationId, id) });
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists(organizationId) });
      void queryClient.invalidateQueries({
        queryKey: [...customerKeys.all(organizationId), 'stats'],
      });
    },
  });
}

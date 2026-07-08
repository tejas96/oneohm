'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import {
  CustomerSortField,
  CustomerStatus,
  LeadSource,
  type PaginationMeta,
  SortOrder,
} from '@tejas96/shared/types';
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
  leadSource?: LeadSource;
  createdBy?: string; // 'me' for field workers or actual userId
  assigneeId?: string; // 'me' or actual userId
  hasProperty?: boolean;
  fromDate?: string; // ISO date string (YYYY-MM-DD)
  toDate?: string; // ISO date string (YYYY-MM-DD)
  groupSearch?: string; // filter by group name or code (partial match)
  // Sorting
  sortBy?: CustomerSortField;
  sortOrder?: SortOrder;
  // Query control
  enabled?: boolean;
}

export interface Customer {
  id: string;
  organizationId: string;
  firstName: string;
  middleName?: string;
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
  groupCode?: string;
  groupName?: string;
  status: CustomerStatus;
  propertyCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  creatorName?: string;
  assigneeId?: string;
  assigneeName?: string;
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
  middleName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string;
  alternatePhone?: string | null;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  leadSource?: string;
  referralCode?: string;
  groupCode?: string | null;
  groupName?: string | null;
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
  const { enabled: callerEnabled, ...queryFilters } = filters;

  return useQuery({
    queryKey: customerKeys.list(organizationId, queryFilters as Record<string, unknown>),
    queryFn: async (): Promise<CustomerListResponse> => {
      const params = new URLSearchParams();

      // Pagination
      if (queryFilters.page) params.append('page', String(queryFilters.page));
      if (queryFilters.limit) params.append('limit', String(queryFilters.limit));

      // Search (min 2 chars)
      if (queryFilters.search && queryFilters.search.length >= 2) {
        params.append('search', queryFilters.search);
      }

      // Filters
      if (queryFilters.status) params.append('status', queryFilters.status);
      if (queryFilters.city) params.append('city', queryFilters.city);
      if (queryFilters.leadSource) params.append('leadSource', queryFilters.leadSource);
      if (queryFilters.createdBy) params.append('createdBy', queryFilters.createdBy);
      if (queryFilters.assigneeId) params.append('assigneeId', queryFilters.assigneeId);
      if (queryFilters.hasProperty !== undefined)
        params.append('hasProperty', String(queryFilters.hasProperty));
      if (queryFilters.fromDate) params.append('fromDate', queryFilters.fromDate);
      if (queryFilters.toDate) params.append('toDate', queryFilters.toDate);
      if (queryFilters.groupSearch) params.append('groupSearch', queryFilters.groupSearch);

      // Sorting
      if (queryFilters.sortBy) params.append('sortBy', queryFilters.sortBy);
      if (queryFilters.sortOrder) params.append('sortOrder', queryFilters.sortOrder);

      const { data } = await apiClient.get<CustomerListResponse>(
        `/customers?${params.toString()}`,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    enabled: !!organizationId && callerEnabled !== false,
    // Keep previous data visible while new data loads to prevent UI flicker
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to fetch a single customer by ID
 */
export function useCustomer(
  id: string,
  options?: { enabled?: boolean },
): UseQueryResult<Customer, AxiosError> {
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
    enabled: !!id && !!organizationId && options?.enabled !== false,
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
 * Hook to assign or unassign a customer to a user.
 * Pass assigneeId as a UUID to assign, or null to unassign.
 */
export function useAssignCustomer(): UseMutationResult<
  Customer,
  AxiosError,
  { id: string; assigneeId: string | null }
> {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async ({ id, assigneeId }): Promise<Customer> => {
      const { data: response } = await apiClient.patch<Customer>(
        `/customers/${id}/assignee`,
        { assigneeId },
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return response;
    },
    onSuccess: (updatedCustomer) => {
      // Update the detail cache immediately so the UI reflects the new assignee without a refetch
      queryClient.setQueryData(
        customerKeys.detail(organizationId, updatedCustomer.id),
        updatedCustomer,
      );
      // Do NOT invalidate the list queries here — assigning an employee to a customer
      // does not change what appears in the customer list, and triggering a full list
      // refetch would cause a spurious /customers pagination request every time.
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

export interface CustomerGroup {
  groupCode: string;
  groupName: string;
}

/**
 * Hook to fetch distinct customer groups for the organization.
 * Used to populate the group selector on the customer form.
 */
export function useCustomerGroups(): UseQueryResult<CustomerGroup[], AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: [...customerKeys.all(organizationId), 'groups'] as const,
    queryFn: async (): Promise<CustomerGroup[]> => {
      const { data } = await apiClient.get<CustomerGroup[]>('/customers/groups', {
        headers: { 'X-Organization-Id': organizationId },
      });
      return data;
    },
    enabled: !!organizationId,
  });
}

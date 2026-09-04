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
  ConnectionType,
  CustomerSortField,
  CustomerStatus,
  LeadSource,
  LeadTemperature,
  type PaginationMeta,
  PropertyStatus,
  PropertyType,
  QuoteStatus,
  SortOrder,
} from '@tejas96/shared/types';
import { hasContradictoryCustomerPropertyFilters } from '@tejas96/shared/utils';
import type { AxiosError } from 'axios';

import { customerKeys } from './use-create-customer';

import { showToast } from '@/components/ui';
import { apiClient } from '@/lib/api/client';

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
  /** Customers with (true) or without (false) open or in-progress tickets. */
  hasActiveTickets?: boolean;
  needsFollowup?: boolean;
  fromDate?: string; // ISO date string (YYYY-MM-DD)
  toDate?: string; // ISO date string (YYYY-MM-DD)
  groupSearch?: string; // filter by group name or code (partial match)
  // Property-level filters (customer has at least one matching property)
  propertyType?: PropertyType;
  propertyStatus?: PropertyStatus;
  connectionType?: ConnectionType;
  leadTemperature?: LeadTemperature;
  quoteStatus?: QuoteStatus;
  propertySystemSizeMin?: number;
  propertySystemSizeMax?: number;
  propertyCity?: string;
  propertyState?: string;
  propertyConsumerNumber?: string;
  // Sorting
  sortBy?: CustomerSortField;
  sortOrder?: SortOrder;
  // Query control
  enabled?: boolean;
}

/**
 * Server-computed roll-up of a customer's sites. Present on list responses
 * only — it exists so the list's "Site portfolio" column renders from the page
 * payload instead of firing one properties request per visible row.
 *
 * Mirrors `SitePortfolioDto`.
 */
export interface SitePortfolio {
  siteCount: number;
  /** Site counts keyed by `PropertyStatus` — drives the distribution bar. */
  statusCounts: Record<string, number>;
  convertedCount: number;
  quotedSiteCount: number;
  totalSystemSizeKw: number;
  /**
   * A converted site counted at its contract, everything else at its quote.
   * Not "quoted": the contract moves when material added on site is billed.
   */
  totalPortfolioAmount: number;
}

export interface Customer {
  id: string;
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
  /** Open or in-progress service tickets. Drives the active-tickets chip. */
  activeTicketCount: number;
  /** List responses only; omitted on single-customer reads. */
  sitePortfolio?: SitePortfolio;
  deleteBlockReasons?: string[];
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
  lost: number;
}

/**
 * Company-wide CRM roll-up backing the four KPI cards on the customer
 * list. Mirrors `CustomerOverviewStatsDto`.
 */
export interface CustomerOverviewStats {
  customers: number;
  customersThisMonth: number;
  sites: number;
  sitesThisMonth: number;
  /** Quoted value of sites still in play — quote sent/viewed, not yet converted. */
  pipelineValue: number;
  awaitingReply: number;
  /** Of `awaitingReply`, unanswered for more than 7 days. */
  awaitingAgeing: number;
  /** Customers with at least one open site nobody owes an action. */
  needsFollowup: number;
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
  const { enabled: callerEnabled, ...queryFilters } = filters;

  return useQuery({
    queryKey: customerKeys.list(queryFilters as Record<string, unknown>),
    queryFn: async (): Promise<CustomerListResponse> => {
      if (hasContradictoryCustomerPropertyFilters(queryFilters)) {
        const page = queryFilters.page ?? 1;
        const limit = queryFilters.limit ?? 20;
        return {
          data: [],
          meta: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        };
      }

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
      if (queryFilters.hasActiveTickets !== undefined)
        params.append('hasActiveTickets', String(queryFilters.hasActiveTickets));
      if (queryFilters.needsFollowup !== undefined)
        params.append('needsFollowup', String(queryFilters.needsFollowup));
      if (queryFilters.fromDate) params.append('fromDate', queryFilters.fromDate);
      if (queryFilters.toDate) params.append('toDate', queryFilters.toDate);
      if (queryFilters.groupSearch) params.append('groupSearch', queryFilters.groupSearch);
      if (queryFilters.propertyType) params.append('propertyType', queryFilters.propertyType);
      if (queryFilters.propertyStatus) params.append('propertyStatus', queryFilters.propertyStatus);
      if (queryFilters.connectionType) params.append('connectionType', queryFilters.connectionType);
      if (queryFilters.leadTemperature)
        params.append('leadTemperature', queryFilters.leadTemperature);
      if (queryFilters.quoteStatus) params.append('quoteStatus', queryFilters.quoteStatus);
      if (queryFilters.propertySystemSizeMin !== undefined) {
        params.append('propertySystemSizeMin', String(queryFilters.propertySystemSizeMin));
      }
      if (queryFilters.propertySystemSizeMax !== undefined) {
        params.append('propertySystemSizeMax', String(queryFilters.propertySystemSizeMax));
      }
      if (queryFilters.propertyCity) params.append('propertyCity', queryFilters.propertyCity);
      if (queryFilters.propertyState) params.append('propertyState', queryFilters.propertyState);
      if (queryFilters.propertyConsumerNumber)
        params.append('propertyConsumerNumber', queryFilters.propertyConsumerNumber);

      // Sorting
      if (queryFilters.sortBy) params.append('sortBy', queryFilters.sortBy);
      if (queryFilters.sortOrder) params.append('sortOrder', queryFilters.sortOrder);

      const { data } = await apiClient.get<CustomerListResponse>(`/customers?${params.toString()}`);
      return data;
    },
    enabled: callerEnabled !== false,
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
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: async (): Promise<Customer> => {
      const { data } = await apiClient.get<Customer>(`/customers/${id}`, {});
      return data;
    },
    enabled: !!id && options?.enabled !== false,
  });
}

/**
 * Hook to fetch customer status statistics
 */
export function useCustomerStats(): UseQueryResult<CustomerStatsResponse, AxiosError> {
  return useQuery({
    queryKey: [...customerKeys.all(), 'stats'] as const,
    queryFn: async (): Promise<CustomerStatsResponse> => {
      const { data } = await apiClient.get<CustomerStatsResponse>(
        '/customers/statistics/status',
        {},
      );
      return data;
    },
  });
}

/**
 * Hook to fetch the CRM overview roll-up for the customer list's KPI cards.
 *
 * Kept separate from `useCustomers` on purpose: these figures are
 * company-wide and independent of the table's page, sort and filters, so
 * folding them into the list query would refetch four unchanging numbers on
 * every keystroke of the search box.
 */
export function useCustomerOverviewStats(): UseQueryResult<CustomerOverviewStats, AxiosError> {
  return useQuery({
    queryKey: [...customerKeys.all(), 'overview'] as const,
    queryFn: async (): Promise<CustomerOverviewStats> => {
      const { data } = await apiClient.get<CustomerOverviewStats>('/customers/statistics/overview');
      return data;
    },
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

  return useMutation({
    mutationFn: async ({ id, data }): Promise<Customer> => {
      const { data: response } = await apiClient.patch<Customer>(`/customers/${id}`, data, {});
      return response;
    },
    onSuccess: (updatedCustomer) => {
      queryClient.setQueryData(customerKeys.detail(updatedCustomer.id), updatedCustomer);
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: [...customerKeys.all(), 'stats'],
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

  return useMutation({
    mutationFn: async ({ id, status }): Promise<Customer> => {
      const { data: response } = await apiClient.post<Customer>(`/customers/${id}/status`, {
        status,
      });
      return response;
    },
    onSuccess: (updatedCustomer) => {
      queryClient.setQueryData(customerKeys.detail(updatedCustomer.id), updatedCustomer);
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: [...customerKeys.all(), 'stats'],
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

  return useMutation({
    mutationFn: async ({ id, assigneeId }): Promise<Customer> => {
      const { data: response } = await apiClient.patch<Customer>(`/customers/${id}/assignee`, {
        assigneeId,
      });
      return response;
    },
    onSuccess: (updatedCustomer) => {
      // Update the detail cache immediately so the UI reflects the new assignee without a refetch
      queryClient.setQueryData(customerKeys.detail(updatedCustomer.id), updatedCustomer);
      // Do NOT invalidate the list queries here — assigning an employee to a customer
      // does not change what appears in the customer list, and triggering a full list
      // refetch would cause a spurious /customers pagination request every time.
    },
  });
}

/**
 * Hook to permanently delete a customer (blocked when properties/quotes/financial records exist)
 */
export function useDeleteCustomer(): UseMutationResult<void, AxiosError, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/customers/${id}`, {});
    },
    onSuccess: (_, id) => {
      showToast.success('Customer permanently deleted');
      queryClient.removeQueries({ queryKey: customerKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: [...customerKeys.all(), 'stats'],
      });
    },
    onError: (error: AxiosError<{ message?: string | string[] }>) => {
      const message = error.response?.data?.message;
      const text = Array.isArray(message) ? message[0] : message;
      showToast.error(text || 'Failed to delete customer');
    },
  });
}

export interface CustomerGroup {
  groupCode: string;
  groupName: string;
}

/**
 * Hook to fetch distinct customer groups.
 * Used to populate the group selector on the customer form.
 */
export function useCustomerGroups(): UseQueryResult<CustomerGroup[], AxiosError> {
  return useQuery({
    queryKey: [...customerKeys.all(), 'groups'] as const,
    queryFn: async (): Promise<CustomerGroup[]> => {
      const { data } = await apiClient.get<CustomerGroup[]>('/customers/groups', {});
      return data;
    },
  });
}

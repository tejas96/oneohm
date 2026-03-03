import type { CustomerStatus, LeadTemperature } from '@oneohm-epc/shared-types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

/**
 * Lead query keys for cache management
 */
export const leadKeys = {
  all: (orgId?: string) => ['leads', orgId] as const,
  lists: (orgId?: string) => [...leadKeys.all(orgId), 'list'] as const,
  list: (orgId: string | undefined, filters: LeadFilters) =>
    [...leadKeys.lists(orgId), filters] as const,
  details: (orgId?: string) => [...leadKeys.all(orgId), 'detail'] as const,
  detail: (orgId: string | undefined, id: string) => [...leadKeys.details(orgId), id] as const,
};

/**
 * Lead filters interface
 */
export interface LeadFilters {
  page?: number;
  limit?: number;
  status?: CustomerStatus;
  temperature?: LeadTemperature;
  search?: string;
  assignedTo?: string;
}

/**
 * Lead response interface (simplified, uses shared types)
 */
export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  status: CustomerStatus;
  temperature?: LeadTemperature;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Hook to fetch leads with pagination and filters
 */
export function useLeads(filters: LeadFilters = {}) {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: leadKeys.list(organizationId, filters),
    queryFn: async (): Promise<PaginatedResponse<Lead>> => {
      const { data } = await apiClient.get('/customers', {
        params: { ...filters, status: 'lead' },
        headers: { 'X-Organization-Id': organizationId },
      });
      return data;
    },
    enabled: !!organizationId,
  });
}

/**
 * Hook to fetch a single lead by ID
 */
export function useLead(id: string) {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: leadKeys.detail(organizationId, id),
    queryFn: async (): Promise<Lead> => {
      const { data } = await apiClient.get(`/customers/${id}`, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return data;
    },
    enabled: !!id && !!organizationId,
  });
}

/**
 * Create lead DTO
 */
export interface CreateLeadDto {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  source?: string;
  temperature?: LeadTemperature;
  notes?: string;
}

/**
 * Hook to create a new lead
 */
export function useCreateLead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async (lead: CreateLeadDto): Promise<Lead> => {
      const { data } = await apiClient.post(
        '/customers',
        {
          ...lead,
          status: 'lead',
        },
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists(organizationId) });
    },
  });
}

/**
 * Update lead DTO
 */
export interface UpdateLeadDto extends Partial<CreateLeadDto> {
  status?: CustomerStatus;
}

/**
 * Hook to update a lead
 */
export function useUpdateLead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateLeadDto & { id: string }): Promise<Lead> => {
      const { data } = await apiClient.patch(`/customers/${id}`, updates, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(leadKeys.detail(organizationId, data.id), data);
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists(organizationId) });
    },
  });
}

/**
 * Hook to delete a lead
 */
export function useDeleteLead() {
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
      queryClient.removeQueries({ queryKey: leadKeys.detail(organizationId, id) });
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists(organizationId) });
    },
  });
}

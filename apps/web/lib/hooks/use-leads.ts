import type { CustomerStatus, LeadTemperature } from '@oneohm-epc/shared-types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

/**
 * Lead query keys for cache management
 */
export const leadKeys = {
  all: ['leads'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (filters: LeadFilters) => [...leadKeys.lists(), filters] as const,
  details: () => [...leadKeys.all, 'detail'] as const,
  detail: (id: string) => [...leadKeys.details(), id] as const,
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
  return useQuery({
    queryKey: leadKeys.list(filters),
    queryFn: async (): Promise<PaginatedResponse<Lead>> => {
      const { data } = await apiClient.get('/customers', {
        params: {
          ...filters,
          status: 'lead', // Only fetch leads
        },
      });
      return data;
    },
  });
}

/**
 * Hook to fetch a single lead by ID
 */
export function useLead(id: string) {
  return useQuery({
    queryKey: leadKeys.detail(id),
    queryFn: async (): Promise<Lead> => {
      const { data } = await apiClient.get(`/customers/${id}`);
      return data;
    },
    enabled: !!id,
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

  return useMutation({
    mutationFn: async (lead: CreateLeadDto): Promise<Lead> => {
      const { data } = await apiClient.post('/customers', {
        ...lead,
        status: 'lead',
      });
      return data;
    },
    onSuccess: () => {
      // Invalidate leads list to refetch
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
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

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateLeadDto & { id: string }): Promise<Lead> => {
      const { data } = await apiClient.patch(`/customers/${id}`, updates);
      return data;
    },
    onSuccess: (data) => {
      // Update the specific lead in cache
      queryClient.setQueryData(leadKeys.detail(data.id), data);
      // Invalidate lists to refetch
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

/**
 * Hook to delete a lead
 */
export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/customers/${id}`);
    },
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: leadKeys.detail(id) });
      // Invalidate lists
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

'use client';

import { useMutation, useQuery, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import type { CreatePropertyFormData } from '../schemas/property.schema';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

// ============================================================================
// Query Keys
// ============================================================================

export const propertyKeys = {
  all: ['properties'] as const,
  lists: () => [...propertyKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...propertyKeys.lists(), filters] as const,
  details: () => [...propertyKeys.all, 'detail'] as const,
  detail: (id: string) => [...propertyKeys.details(), id] as const,
};

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...customerKeys.lists(), filters] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface PropertyResponse {
  id: string;
  customerId: string;
  organizationId: string;
  propertyName?: string;
  propertyType: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  discomName?: string;
  connectionType?: string;
  sanctionedLoad?: number;
  consumerNumber?: string;
  meterNumber?: string;
  monthlyBill?: number;
  leadTemperature: string;
  isPrimary: boolean;
  wantsLoan: boolean;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerResponse {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  status: string;
  propertyCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Document type matching backend PropertyDocumentDto
export interface PropertyDocumentDto {
  url: string;
  tag: string;
  fileName: string;
  isLoanDoc?: boolean;
  isVerified?: boolean;
}

// Extended form data that includes documents
export interface CreatePropertyWithDocsData extends CreatePropertyFormData {
  documents?: PropertyDocumentDto[];
}

// ============================================================================
// useCreateProperty Hook
// ============================================================================

/**
 * Hook to create a new property for a customer
 * Uses TanStack Query mutation with cache invalidation
 */
export function useCreateProperty(): UseMutationResult<
  PropertyResponse,
  AxiosError,
  CreatePropertyWithDocsData
> {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async (data: CreatePropertyWithDocsData): Promise<PropertyResponse> => {
      const { data: response } = await apiClient.post<PropertyResponse>(
        '/customer-properties',
        data,
        {
          headers: { 'X-Organization-Id': organizationId },
        }
      );
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidate property lists to refetch
      void queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });
      // Invalidate customer detail to update property count
      void queryClient.invalidateQueries({
        queryKey: customerKeys.detail(variables.customerId),
      });
      // Invalidate customer lists too (for property count)
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

// ============================================================================
// useCustomersList Hook
// ============================================================================

/**
 * Hook to fetch customers list for selector dropdown
 */
export function useCustomersList() {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: customerKeys.lists(),
    queryFn: async (): Promise<PaginatedResponse<CustomerResponse>> => {
      const { data } = await apiClient.get<PaginatedResponse<CustomerResponse>>('/customers', {
        headers: { 'X-Organization-Id': organizationId },
        params: { limit: 100 }, // Get enough for dropdown
      });
      return data;
    },
    enabled: !!organizationId,
  });
}

// ============================================================================
// useCustomerById Hook
// ============================================================================

/**
 * Hook to fetch a single customer by ID
 */
export function useCustomerById(customerId: string | undefined) {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: customerKeys.detail(customerId ?? ''),
    queryFn: async (): Promise<CustomerResponse> => {
      const { data } = await apiClient.get<CustomerResponse>(`/customers/${customerId}`, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return data;
    },
    enabled: !!organizationId && !!customerId,
  });
}

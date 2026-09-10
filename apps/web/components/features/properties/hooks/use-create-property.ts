'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { propertyKeys } from './property-keys';
import type { DiscomResponse } from './use-discoms';
import type { CreatePropertyFormData } from '../schemas/property.schema';

import { apiClient } from '@/lib/api/client';

// ============================================================================
// Query Keys
// ============================================================================

export { propertyKeys } from './property-keys';

export const customerKeys = {
  all: () => ['customers'] as const,
  lists: () => [...customerKeys.all(), 'list'] as const,
  list: (filters: Record<string, unknown>) => [...customerKeys.lists(), filters] as const,
  details: () => [...customerKeys.all(), 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface PropertyResponse {
  id: string;
  customerId: string;
  propertyName?: string;
  propertyType: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  discomId?: string;
  discom?: DiscomResponse;
  connectionType?: string;
  sanctionedLoad?: number;
  consumerNumber?: string;
  meterNumber?: string;
  currentLoad?: string;
  leadTemperature: string;
  isPrimary: boolean;
  wantsLoan: boolean;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Document type matching backend PropertyDocumentDto
interface PropertyDocumentDto {
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

  return useMutation({
    mutationFn: async (data: CreatePropertyWithDocsData): Promise<PropertyResponse> => {
      const { data: response } = await apiClient.post<PropertyResponse>(
        '/customer-properties',
        data,
        {},
      );
      return response;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: propertyKeys.all() });
      void queryClient.invalidateQueries({
        queryKey: customerKeys.detail(variables.customerId),
      });
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

// ============================================================================
// useCustomersList Hook
// ============================================================================

// ============================================================================
// useCustomerById Hook
// ============================================================================

'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { ChangeRequestItemFormData } from '@tejas96/shared/schemas';
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
  ShadingAnalysis,
  SurveyData,
} from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { customerKeys, propertyKeys } from './use-create-property';
import type { DiscomResponse } from './use-discoms';

import { showToast } from '@/components/ui';
import { apiClient } from '@/lib/api/client';

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
  discomId?: string;
  discom?: DiscomResponse;
  connectionType?: ConnectionType;
  sanctionedLoad?: number;
  meterNumber?: string;
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
  projectId?: string;
  hasActiveLoan?: boolean;
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
  discomId?: string;
  connectionType?: ConnectionType;
  sanctionedLoad?: number;
  meterNumber?: string;
  currentLoad?: string;
  leadTemperature?: LeadTemperature;
  wantsLoan?: boolean;
  status?: PropertyStatus;
  notes?: string;
  isPrimary?: boolean;
  documents?: PropertyDocument[];
  availableRoofAreaSqft?: number | null;
  shadingAnalysis?: ShadingAnalysis | null;
  siteNotes?: string | null;
  surveyData?: SurveyData | null;
  siteVisitAssignee?: string | null;
  siteSurveyAssignee?: string | null;
  changeRequests?: ChangeRequestItemFormData[];
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
      );
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: propertyKeys.all() });
      void queryClient.invalidateQueries({
        queryKey: customerKeys.lists(),
      });
    },
  });
}

/**
 * Hook to permanently delete a property (blocked when quotes/project/active loan exist)
 */
export function useDeleteProperty(): UseMutationResult<void, AxiosError, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/customer-properties/${id}`, {
      });
    },
    onSuccess: () => {
      showToast.success('Property permanently deleted');
      void queryClient.invalidateQueries({ queryKey: propertyKeys.all() });
      void queryClient.invalidateQueries({
        queryKey: customerKeys.lists(),
      });
    },
    onError: (error: AxiosError<{ message?: string | string[] }>) => {
      const message = error.response?.data?.message;
      const text = Array.isArray(message) ? message[0] : message;
      showToast.error(text || 'Failed to delete property');
    },
  });
}

/**
 * Hook to complete a site visit for a property
 */
export function useCompletePropertyVisit(): UseMutationResult<Property, AxiosError, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (propertyId: string): Promise<Property> => {
      const { data } = await apiClient.post<Property>(
        `/customer-properties/${propertyId}/complete-visit`,
        {},
      );
      return data;
    },
    onSuccess: (_, propertyId) => {
      showToast.success('Site visit marked as completed');
      void queryClient.invalidateQueries({
        queryKey: propertyKeys.detail(propertyId),
      });
      void queryClient.invalidateQueries({ queryKey: propertyKeys.all() });
    },
    onError: (error: AxiosError<{ message?: string | string[] }>) => {
      const message = error.response?.data?.message;
      const text = Array.isArray(message) ? message[0] : message;
      showToast.error(text || 'Failed to complete site visit');
    },
  });
}

/**
 * Hook to complete a site survey for a property
 */
export function useCompletePropertySurvey(): UseMutationResult<Property, AxiosError, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (propertyId: string): Promise<Property> => {
      const { data } = await apiClient.post<Property>(
        `/customer-properties/${propertyId}/complete-survey`,
        {},
      );
      return data;
    },
    onSuccess: (_, propertyId) => {
      showToast.success('Site survey marked as completed');
      void queryClient.invalidateQueries({
        queryKey: propertyKeys.detail(propertyId),
      });
      void queryClient.invalidateQueries({ queryKey: propertyKeys.all() });
    },
    onError: (error: AxiosError<{ message?: string | string[] }>) => {
      const message = error.response?.data?.message;
      const text = Array.isArray(message) ? message[0] : message;
      showToast.error(text || 'Failed to complete site survey');
    },
  });
}

/**
 * Hook to cancel a site activity for a property
 */
export function useCancelPropertySiteActivity(): UseMutationResult<Property, AxiosError, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (propertyId: string): Promise<Property> => {
      const { data } = await apiClient.post<Property>(
        `/customer-properties/${propertyId}/cancel-site-activity`,
        {},
      );
      return data;
    },
    onSuccess: (_, propertyId) => {
      showToast.success('Site activity cancelled');
      void queryClient.invalidateQueries({
        queryKey: propertyKeys.detail(propertyId),
      });
      void queryClient.invalidateQueries({ queryKey: propertyKeys.all() });
    },
    onError: (error: AxiosError<{ message?: string | string[] }>) => {
      const message = error.response?.data?.message;
      const text = Array.isArray(message) ? message[0] : message;
      showToast.error(text || 'Failed to cancel site activity');
    },
  });
}

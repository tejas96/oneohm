'use client';

import {
  ConnectionType,
  LeadTemperature,
  PropertyStatus,
  PropertyType,
  QuoteStatus,
} from '@oneohm-epc/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';


import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

// ============================================================================
// Types
// ============================================================================

/**
 * Property Document stored in the documents JSONB field
 */
export interface PropertyDocument {
  url: string;
  tag: string;
  fileName: string;
  isLoanDoc: boolean;
  isVerified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  fileSize?: number;
  uploadedAt?: string;
}

/**
 * Customer Property - Installation site belonging to a customer
 * Matches CustomerPropertyResponseDto from backend
 */
export interface CustomerPropertyResponse {
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
  locationCoordinates?: string;
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
  roofAreaSqft?: number;
  // Lead Tracking
  leadTemperature: LeadTemperature;
  // Flags
  isPrimary: boolean;
  wantsLoan: boolean;
  // Documents
  documents: PropertyDocument[];
  // Status
  status: PropertyStatus;
  // Notes
  notes?: string;
  // Audit Fields
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  // Enriched: customer info (populated from customer relation)
  customerName?: string;
  customerPhone?: string;
  // Enriched: creator info (populated from creator relation)
  creatorName?: string;
  // Quote Info (enriched from quotes table)
  latestQuoteNumber?: string;
  latestQuoteStatus?: QuoteStatus;
  latestQuoteDate?: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const propertyKeys = {
  all: (orgId?: string) => ['properties', orgId] as const,
  lists: (orgId?: string) => [...propertyKeys.all(orgId), 'list'] as const,
  byCustomer: (orgId: string | undefined, customerId: string) =>
    [...propertyKeys.all(orgId), 'customer', customerId] as const,
  detail: (orgId: string | undefined, id: string) =>
    [...propertyKeys.all(orgId), 'detail', id] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch all properties for a specific customer
 *
 * @param customerId - The customer UUID to fetch properties for
 * @returns Properties for the customer with quote info enrichment
 *
 * @example
 * const { data: properties, isLoading } = useCustomerProperties(customerId);
 */
export function useCustomerProperties(
  customerId: string
): UseQueryResult<CustomerPropertyResponse[], AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: propertyKeys.byCustomer(organizationId, customerId),
    queryFn: async (): Promise<CustomerPropertyResponse[]> => {
      const { data } = await apiClient.get<CustomerPropertyResponse[]>(
        `/customer-properties/customer/${customerId}`,
        { headers: { 'X-Organization-Id': organizationId } }
      );
      return data;
    },
    enabled: !!customerId && !!organizationId,
  });
}

/**
 * Hook to fetch a single property by ID
 *
 * @param propertyId - The property UUID to fetch
 * @returns Property details
 */
export function useProperty(
  propertyId: string
): UseQueryResult<CustomerPropertyResponse, AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: propertyKeys.detail(organizationId, propertyId),
    queryFn: async (): Promise<CustomerPropertyResponse> => {
      const { data } = await apiClient.get<CustomerPropertyResponse>(
        `/customer-properties/${propertyId}`,
        { headers: { 'X-Organization-Id': organizationId } }
      );
      return data;
    },
    enabled: !!propertyId && !!organizationId,
  });
}

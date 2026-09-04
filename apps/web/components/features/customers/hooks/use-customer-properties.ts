'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  ConnectionType,
  LeadTemperature,
  type ProjectStatus,
  type GpsCoordinates,
  type PropertyDocument,
  PropertyStatus,
  PropertyType,
  QuoteStatus,
  SiteStatus,
  type ShadingAnalysis,
  type StoredChangeRequest,
  type SurveyData,
} from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { propertyKeys } from '@/components/features/properties/hooks/property-keys';
import type { DiscomResponse } from '@/components/features/properties/hooks/use-discoms';
import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export type { PropertyDocument };

/**
 * Customer Property - Installation site belonging to a customer
 * Matches CustomerPropertyResponseDto from backend
 */
export interface CustomerPropertyResponse {
  id: string;
  customerId: string;
  propertyCode?: string;
  // Property Details
  propertyName?: string;
  propertyType: PropertyType;
  // Address
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  gpsCoordinates?: GpsCoordinates;
  // Electricity/Consumer Details
  consumerNumber?: string;
  consumerName?: string;
  currentLoad?: string;
  discomId?: string;
  discom?: DiscomResponse;
  connectionType?: ConnectionType;
  sanctionedLoad?: number;
  meterNumber?: string;
  // Lead Tracking
  leadTemperature: LeadTemperature;
  // Flags
  isPrimary: boolean;
  wantsLoan: boolean;
  // Documents
  documents: PropertyDocument[];
  changeRequests?: StoredChangeRequest[];
  // Status
  status: PropertyStatus;
  notes?: string;
  projectId?: string;
  /**
   * The linked project's live status. Present on every list that enriches it —
   * `status` above stops at CONVERTED forever, so it cannot say whether the
   * project finished, stalled or was called off. Read it via `getSiteLifecycle`
   * rather than branching on it at each call site.
   */
  projectStatus?: ProjectStatus;
  // Site Visit / Survey
  siteStatus: SiteStatus;
  siteVisitDone: boolean;
  availableRoofAreaSqft?: number;
  shadingAnalysis?: ShadingAnalysis;
  siteNotes?: string;
  surveyDone: boolean;
  surveyData?: SurveyData;
  siteVisitAssignee?: string;
  siteSurveyAssignee?: string;
  siteVisitAssigneeName?: string;
  siteSurveyAssigneeName?: string;
  siteVisitCompletedAt?: string;
  siteSurveyCompletedAt?: string;
  // Audit Fields
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  // Enriched: customer info (populated from customer relation)
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  // Enriched: creator info (populated from creator relation)
  creatorName?: string;
  // Quote Info (enriched from quotes table)
  latestQuoteId?: string;
  latestQuoteNumber?: string;
  latestQuoteStatus?: QuoteStatus;
  latestQuoteDate?: string;
  latestQuoteFinalPrice?: number;
  latestQuoteSystemSizeKw?: number;
  project?: {
    id: string;
    status: string;
    name: string;
  };
  // Follow-up state (enriched via shared predicate — do not re-derive on the client)
  nextFollowupAt?: string | null;
  needsFollowup?: boolean;
}

// ============================================================================
// Query Keys
// ============================================================================

export { propertyKeys } from '@/components/features/properties/hooks/property-keys';

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
  customerId: string,
  options?: { enabled?: boolean },
): UseQueryResult<CustomerPropertyResponse[], AxiosError> {
  return useQuery({
    queryKey: propertyKeys.byCustomer(customerId),
    queryFn: async (): Promise<CustomerPropertyResponse[]> => {
      const { data } = await apiClient.get<CustomerPropertyResponse[]>(
        `/customer-properties/customer/${customerId}`,
      );
      return data;
    },
    enabled: !!customerId && options?.enabled !== false,
  });
}

/**
 * Hook to fetch a single property by ID
 *
 * @param propertyId - The property UUID to fetch
 * @returns Property details
 */
export function useProperty(
  propertyId: string,
): UseQueryResult<CustomerPropertyResponse, AxiosError> {
  return useQuery({
    queryKey: propertyKeys.detail(propertyId),
    queryFn: async (): Promise<CustomerPropertyResponse> => {
      const { data } = await apiClient.get<CustomerPropertyResponse>(
        `/customer-properties/${propertyId}`,
      );
      return data;
    },
    enabled: !!propertyId,
  });
}

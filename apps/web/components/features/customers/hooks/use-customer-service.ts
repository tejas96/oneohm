'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ServiceRequestPriority, ServiceRequestStatus } from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';

export interface CustomerServiceRequest {
  id: string;
  projectId: string;
  customerId: string;
  requestNumber: string;
  requestDate: string;
  issueTitle: string;
  issueDescription: string;
  issueCategory?: string;
  priority: ServiceRequestPriority;
  status: ServiceRequestStatus;
  assignedToUserId?: string;
  resolutionNotes?: string;
  customerRating?: number;
  customerFeedback?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFeedbackItem {
  id: string;
  projectId: string;
  customerId: string;
  overallRating?: number | null;
  npsScore?: number | null;
  npsCategory?: string | null;
  comments?: string | null;
  wouldRecommend?: boolean | null;
  companyResponse?: string | null;
  createdAt: string;
}

export const customerServiceKeys = {
  requests: (orgId?: string, customerId?: string) =>
    ['customer-service-requests', orgId, customerId] as const,
  feedback: (orgId?: string, customerId?: string) =>
    ['customer-feedback', orgId, customerId] as const,
};

export function useCustomerServiceRequests(
  customerId: string,
  options?: { enabled?: boolean },
): UseQueryResult<CustomerServiceRequest[], AxiosError> {
  return useQuery({
    queryKey: customerServiceKeys.requests(customerId),
    queryFn: async (): Promise<CustomerServiceRequest[]> => {
      const { data } = await apiClient.get<CustomerServiceRequest[]>(
        `/service-requests/customer/${customerId}?includeRelations=true`,
      );
      return data;
    },
    enabled: !!customerId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useCustomerFeedback(
  customerId: string,
  options?: { enabled?: boolean },
): UseQueryResult<CustomerFeedbackItem[], AxiosError> {
  return useQuery({
    queryKey: customerServiceKeys.feedback(customerId),
    queryFn: async (): Promise<CustomerFeedbackItem[]> => {
      const { data } = await apiClient.get<CustomerFeedbackItem[]>(
        `/customer-feedback/customer/${customerId}`,
      );
      return data;
    },
    enabled: !!customerId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

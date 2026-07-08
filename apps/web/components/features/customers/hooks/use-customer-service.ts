'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ServiceRequestPriority, ServiceRequestStatus } from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

export interface CustomerServiceRequest {
  id: string;
  organizationId: string;
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
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: customerServiceKeys.requests(organizationId, customerId),
    queryFn: async (): Promise<CustomerServiceRequest[]> => {
      const { data } = await apiClient.get<CustomerServiceRequest[]>(
        `/service-requests/customer/${customerId}?includeRelations=true`,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    enabled: !!customerId && !!organizationId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useCustomerFeedback(
  customerId: string,
  options?: { enabled?: boolean },
): UseQueryResult<CustomerFeedbackItem[], AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: customerServiceKeys.feedback(organizationId, customerId),
    queryFn: async (): Promise<CustomerFeedbackItem[]> => {
      const { data } = await apiClient.get<CustomerFeedbackItem[]>(
        `/customer-feedback/customer/${customerId}`,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    enabled: !!customerId && !!organizationId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

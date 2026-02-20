'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

export interface EmployeeListItem {
  id: string;
  userId: string;
  organizationId: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  designation?: string | null;
  status: string;
}

interface EmployeeListResponse {
  items: EmployeeListItem[];
  total: number;
  page: number;
  limit: number;
}

export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...employeeKeys.lists(), filters] as const,
};

export function useEmployees(
  options?: { page?: number; limit?: number; status?: string; department?: string },
): UseQueryResult<EmployeeListResponse, AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: employeeKeys.list({ organizationId, ...options }),
    queryFn: async (): Promise<EmployeeListResponse> => {
      const params = new URLSearchParams();
      if (options?.page) params.append('page', String(options.page));
      if (options?.limit) params.append('limit', String(options.limit));
      if (options?.status) params.append('status', options.status);
      if (options?.department) params.append('department', options.department);

      const { data } = await apiClient.get<EmployeeListResponse>(
        `/employees?${params.toString()}`,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    enabled: !!organizationId,
  });
}

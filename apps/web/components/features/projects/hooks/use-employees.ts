'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';

export interface EmployeeUser {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
}

export interface EmployeeListItem {
  id: string;
  userId: string;
  user?: EmployeeUser | null;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  designation?: string | null;
  roles?: string[];
  status: string;
}

interface EmployeeListResponse {
  items: EmployeeListItem[];
  total: number;
  page: number;
  limit: number;
}

export const employeeKeys = {
  all: () => ['employees'] as const,
  lists: () => [...employeeKeys.all(), 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...employeeKeys.lists(), filters] as const,
};

export function useEmployees(options?: {
  page?: number;
  limit?: number;
  status?: string;
  department?: string;
}): UseQueryResult<EmployeeListResponse, AxiosError> {

  return useQuery({
    queryKey: employeeKeys.list({ ...options }),
    queryFn: async (): Promise<EmployeeListResponse> => {
      const params = new URLSearchParams();
      if (options?.page) params.append('page', String(options.page));
      if (options?.limit) params.append('limit', String(options.limit));
      if (options?.status) params.append('status', options.status);
      if (options?.department) params.append('department', options.department);

      const { data } = await apiClient.get<EmployeeListResponse>(
        `/employees?${params.toString()}`,
      );
      return data;
    },
  });
}

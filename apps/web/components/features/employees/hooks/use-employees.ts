'use client';

import { UserStatus } from '@tejas96/shared/types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

// ============================================================================
// Types
// ============================================================================

export interface EmployeeUser {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
}

export interface Employee {
  id: string;
  userId: string;
  organizationId: string;
  employeeId?: string;
  designation?: string;
  department?: string;
  status: UserStatus;
  user?: EmployeeUser;
}

interface EmployeeListResponse {
  items: Employee[];
  total: number;
  page: number;
  limit: number;
}

export interface UseEmployeesOptions {
  status?: UserStatus;
  limit?: number;
}

// ============================================================================
// Query key factory
// ============================================================================

export const employeeKeys = {
  all: (orgId?: string) => ['employees', orgId] as const,
  list: (orgId?: string, filters?: Record<string, unknown>) =>
    [...employeeKeys.all(orgId), 'list', filters] as const,
};

// ============================================================================
// Hook
// ============================================================================

/**
 * Fetches employees for the current organization.
 * Defaults to active employees only. Used by MUIUserAssigneeSelector.
 */
export function useEmployees(
  options: UseEmployeesOptions = {},
): UseQueryResult<Employee[], AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;
  const { status = UserStatus.ACTIVE, limit = 200 } = options;

  return useQuery({
    queryKey: employeeKeys.list(organizationId, { status, limit }),
    queryFn: async (): Promise<Employee[]> => {
      const params = new URLSearchParams();
      params.append('status', status);
      params.append('limit', String(limit));

      const { data } = await apiClient.get<EmployeeListResponse>(
        `/employees?${params.toString()}`,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data.items;
    },
    enabled: !!organizationId,
    // Employees don't change often — cache for 5 minutes
    staleTime: 5 * 60 * 1000,
  });
}

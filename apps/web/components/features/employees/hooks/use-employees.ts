'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { EmployeeProfileKind, UserStatus } from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';

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
  enabled?: boolean;
  /**
   * Narrow to staff or to resellers. Omitting it returns both, which is the
   * existing behaviour every current caller relies on.
   */
  profileKind?: EmployeeProfileKind;
}

// ============================================================================
// Query key factory
// ============================================================================

export const employeeKeys = {
  all: () => ['employees'] as const,
  list: (filters?: Record<string, unknown>) => [...employeeKeys.all(), 'list', filters] as const,
};

// ============================================================================
// Hook
// ============================================================================

/**
 * Fetches employees.
 * Defaults to active employees only. Used by MUIUserAssigneeSelector.
 */
export function useEmployees(
  options: UseEmployeesOptions = {},
): UseQueryResult<Employee[], AxiosError> {
  const { status = UserStatus.ACTIVE, limit = 200, enabled = true, profileKind } = options;

  return useQuery({
    // Adding `profileKind` does NOT bust the existing caller's cache: React
    // Query hashes this object with JSON.stringify, which drops undefined
    // values, so { status, limit, profileKind: undefined } hashes exactly as
    // { status, limit } did before.
    queryKey: employeeKeys.list({ status, limit, profileKind }),
    queryFn: async (): Promise<Employee[]> => {
      const params = new URLSearchParams();
      params.append('status', status);
      params.append('limit', String(limit));
      if (profileKind) params.append('profileKind', profileKind);

      const { data } = await apiClient.get<EmployeeListResponse>(`/employees?${params.toString()}`);
      return data.items;
    },
    enabled: enabled,
    // Employees don't change often — cache for 5 minutes
    staleTime: 5 * 60 * 1000,
  });
}

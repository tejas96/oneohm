'use client';

import { FIXED_ROLES } from '@tejas96/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useMemo } from 'react';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

export interface EmployeeUser {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
}

/** Canonical fixed-role codes plus visible legacy strings during transition. */
export type EmployeeAccessRoleCode = string;

export interface EmployeeListItem {
  id: string;
  userId: string;
  organizationId: string;
  user?: EmployeeUser | null;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  designation?: string | null;
  roles?: EmployeeAccessRoleCode[];
  status: string;
}

interface EmployeeListResponse {
  items: EmployeeListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface EmployeeRoleFilterOption {
  value: string;
  label: string;
}

export const employeeKeys = {
  all: (orgId?: string) => ['employees', orgId] as const,
  lists: (orgId?: string) => [...employeeKeys.all(orgId), 'list'] as const,
  list: (orgId: string | undefined, filters: Record<string, unknown>) =>
    [...employeeKeys.lists(orgId), filters] as const,
};

export function useEmployees(options?: {
  page?: number;
  limit?: number;
  status?: string;
  department?: string;
}): UseQueryResult<EmployeeListResponse, AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: employeeKeys.list(organizationId, { ...options }),
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

export function useEmployeeRoleFilterOptions(employees: EmployeeListItem[]): {
  options: EmployeeRoleFilterOption[];
  isLoading: boolean;
} {
  return useMemo(() => {
    const codesInUse = new Set(employees.flatMap((employee) => employee.roles ?? []));

    return {
      isLoading: false,
      options: FIXED_ROLES.filter((role) => codesInUse.has(role.code)).map((role) => ({
        value: role.code,
        label: role.label,
      })),
    };
  }, [employees]);
}

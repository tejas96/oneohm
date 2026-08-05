'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  defineResource,
  useResourceDetail,
  useResourceMutations,
  useOrgContext,
  createResourceKeys,
} from '../core';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

// ── Types ──────────────────────────────────────────────────────

export interface EmployeeProfileUser {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
}

export interface EmployeeProfileOrganization {
  id: string;
  name: string;
}

export interface EmployeeProfile {
  id: string;
  userId: string;
  organizationId: string;
  employeeId?: string;
  designation?: string;
  department?: string;
  joiningDate?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  pincode?: string;
  status: string;
  profileKind?: 'staff' | 'reseller';
  companyName?: string;
  companyCode?: string;
  contactPersonName?: string;
  gstin?: string;
  pan?: string;
  commissionPercentage?: number;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  user?: EmployeeProfileUser;
  organization?: EmployeeProfileOrganization;
  roles?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// ── Resource Registration ──────────────────────────────────────

defineResource<EmployeeProfile>(
  'employee-profile',
  {
    endpoint: '/employees',
    syncToUrl: false,
    requiresOrg: true,
  },
  {
    view: 'employees:read',
    update: 'employees:update',
  },
  {
    view: 'profile.view',
    update: 'profile.manage',
  },
);

// ── Hooks ──────────────────────────────────────────────────────

/**
 * Fetch a single employee profile by profile ID.
 */
export function useEmployeeProfile(
  employeeId: string,
): ReturnType<typeof useResourceDetail<EmployeeProfile>> {
  return useResourceDetail<EmployeeProfile>({
    resource: 'employee-profile',
    endpoint: '/employees',
    id: employeeId,
    requiresOrg: true,
    enabled: !!employeeId,
  });
}

/**
 * Fetch the current authenticated user's employee profile via GET /employees/me.
 * Keyed under the 'employee-profile' resource so mutations auto-invalidate it.
 */
export function useCurrentUserEmployeeProfile(): {
  data: EmployeeProfile | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
} {
  const { user } = useAuth();
  const { organizationId, orgHeaders, isReady } = useOrgContext();
  const keys = useMemo(() => createResourceKeys('employee-profile'), []);

  const query = useQuery({
    queryKey: keys.detail(organizationId, `me-${user?.id ?? ''}`),
    queryFn: async (): Promise<EmployeeProfile | null> => {
      const { data } = await apiClient.get<EmployeeProfile | null>('/employees/me', {
        headers: orgHeaders,
      });
      return data ?? null;
    },
    enabled: !!user?.id && isReady,
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as unknown,
    refetch: () => {
      void query.refetch();
    },
  };
}

/**
 * Mutations for the current user's employee profile (update + avatar patch).
 * Uses the 'employee-profile' resource key so the detail cache is invalidated on success.
 */
export function useEmployeeProfileMutations(): ReturnType<
  typeof useResourceMutations<EmployeeProfile>
> {
  return useResourceMutations<EmployeeProfile>({
    resource: 'employee-profile',
    endpoint: '/employees',
    requiresOrg: true,
    toast: {
      update: { success: 'Profile updated successfully', error: 'Failed to update profile' },
    },
  });
}

/**
 * Fetch a user's employee/reseller profile across organizations.
 * Returns the first active profile or null.
 */
export function useUserEmployeeProfile(userId: string): {
  data: EmployeeProfile | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
} {
  const { organizationId, orgHeaders, isReady } = useOrgContext();
  const keys = useMemo(() => createResourceKeys('employee-profile'), []);

  const query = useQuery({
    queryKey: keys.detail(organizationId, `user-${userId}`),
    queryFn: async (): Promise<EmployeeProfile | null> => {
      const { data } = await apiClient.get<EmployeeProfile[]>(`/employees/user/${userId}`, {
        headers: orgHeaders,
      });
      return data && data.length > 0 ? (data[0] ?? null) : null;
    },
    enabled: !!userId && isReady,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as unknown,
    refetch: () => {
      void query.refetch();
    },
  };
}

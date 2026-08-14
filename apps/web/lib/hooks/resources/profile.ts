'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  defineResource,
  useResourceDetail,
  useResourceMutations,
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

export interface EmployeeProfile {
  id: string;
  userId: string;
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
  aadhaarNumberMasked?: string;
  currentProfession?: string;
  yearsOfExperience?: number;
  user?: EmployeeProfileUser;
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
  },
  // No permission codes — this is the user's own data.
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
  const keys = useMemo(() => createResourceKeys('employee-profile'), []);

  const query = useQuery({
    queryKey: keys.detail(`me-${user?.id ?? ''}`),
    queryFn: async (): Promise<EmployeeProfile | null> => {
      const { data } = await apiClient.get<EmployeeProfile | null>('/employees/me');
      return data ?? null;
    },
    enabled: !!user?.id,
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
    toast: {
      update: { success: 'Profile updated successfully', error: 'Failed to update profile' },
    },
  });
}

/**
 * Fetch a user's employee/reseller profile.
 * Returns the first active profile or null.
 */
export function useUserEmployeeProfile(userId: string): {
  data: EmployeeProfile | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
} {
  const keys = useMemo(() => createResourceKeys('employee-profile'), []);

  const query = useQuery({
    queryKey: keys.detail(`user-${userId}`),
    queryFn: async (): Promise<EmployeeProfile | null> => {
      const { data } = await apiClient.get<EmployeeProfile[]>(`/employees/user/${userId}`);
      return data && data.length > 0 ? (data[0] ?? null) : null;
    },
    enabled: !!userId,
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

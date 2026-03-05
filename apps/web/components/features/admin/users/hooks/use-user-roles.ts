'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  roleCode: string;
  roleName?: string;
  organizationId?: string;
  userName?: string;
  userEmail?: string;
  createdAt: string;
}

export function useUserRoles(userId: string) {
  const { user } = useAuth();
  const orgId = user?.organizationId;

  return useQuery<UserRoleAssignment[]>({
    queryKey: ['user-roles', orgId, userId],
    queryFn: async () => {
      const { data } = await apiClient.get<UserRoleAssignment[]>(`/iam/user-roles/user/${userId}`);
      return data;
    },
    enabled: !!userId,
  });
}

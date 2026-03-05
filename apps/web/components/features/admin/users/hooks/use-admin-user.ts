'use client';

import { useQuery } from '@tanstack/react-query';

import { type AdminUser, adminUserKeys } from './use-admin-users';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

export function useAdminUser(userId: string) {
  const { user } = useAuth();
  const orgId = user?.organizationId;

  return useQuery<AdminUser>({
    queryKey: adminUserKeys.detail(orgId, userId),
    queryFn: async () => {
      const { data } = await apiClient.get<AdminUser>(`/users/${userId}`);
      return data;
    },
    enabled: !!userId,
  });
}

'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

export interface TeamWorkloadItem {
  userId: string;
  firstName: string;
  lastName: string;
  activeProjectCount: number;
  totalTaskCount: number;
  inProgressTaskCount: number;
  notCompletedTaskCount: number;
}

export const workloadKeys = {
  all: (orgId?: string) => ['team-workload', orgId] as const,
};

export function useTeamWorkload(): UseQueryResult<TeamWorkloadItem[], AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: workloadKeys.all(organizationId),
    queryFn: async (): Promise<TeamWorkloadItem[]> => {
      const { data } = await apiClient.get<TeamWorkloadItem[]>(
        '/projects/team/workload',
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    enabled: !!organizationId,
  });
}

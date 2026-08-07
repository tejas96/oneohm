'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';

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
  all: () => ['team-workload'] as const,
};

export function useTeamWorkload(): UseQueryResult<TeamWorkloadItem[], AxiosError> {

  return useQuery({
    queryKey: workloadKeys.all(),
    queryFn: async (): Promise<TeamWorkloadItem[]> => {
      const { data } = await apiClient.get<TeamWorkloadItem[]>('/projects/team/workload', {
      });
      return data;
    },
  });
}

'use client';

import { useQuery, keepPreviousData, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';

export interface WorkloadStep {
  stepId: string;
  stepName: string;
  /** Open right now. NOT scoped to the date range. */
  pending: number;
  /** Completed inside the range. */
  completed: number;
  /** Completed ever — context when the range is thin. */
  completedAllTime: number;
  /**
   * The step's budgeted duration. The "standard" half of the client's
   * standard-vs-actual ask; nothing computes an actual against it yet, because
   * task start times are recorded for 0.4% of completed work.
   */
  standardDays: number | null;
}

export interface WorkloadDepartment {
  department: string;
  pending: number;
  completed: number;
  completedAllTime: number;
  steps: WorkloadStep[];
}

export interface WorkloadResponse {
  fromDate: string;
  toDate: string;
  departments: WorkloadDepartment[];
  totalPending: number;
  totalCompleted: number;
}

export interface WorkloadFilters {
  fromDate?: string;
  toDate?: string;
  department?: string;
}

export const workloadKeys = {
  root: () => ['workload'] as const,
  list: (filters: WorkloadFilters) => [...workloadKeys.root(), filters] as const,
};

export function useWorkload(
  filters: WorkloadFilters = {},
  options?: { enabled?: boolean },
): UseQueryResult<WorkloadResponse, AxiosError> {
  const params: Record<string, string> = {};
  if (filters.fromDate) params.fromDate = filters.fromDate;
  if (filters.toDate) params.toDate = filters.toDate;
  if (filters.department) params.department = filters.department;

  return useQuery({
    queryKey: workloadKeys.list(params),
    queryFn: async ({ signal }): Promise<WorkloadResponse> => {
      const { data } = await apiClient.get<WorkloadResponse>('/analytics/workload', {
        params,
        signal,
      });
      return data;
    },
    enabled: options?.enabled !== false,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

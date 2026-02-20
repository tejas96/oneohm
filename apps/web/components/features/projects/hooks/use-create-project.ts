'use client';

import type { ProjectPriority } from '@oneohm-epc/shared-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { projectKeys } from './use-projects';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

export interface InitiateProjectPayload {
  propertyId: string;
  name: string;
  systemSizeKw: number;
  projectType: string;
  description?: string;
  estimatedCost?: number;
  priority?: ProjectPriority;
  startDate?: string;
  endDate?: string;
  projectManagerId?: string;
  teamMembers?: Array<{ userId: string; roleName: string; isProjectManager?: boolean }>;
  excludedTaskTemplateIds?: string[];
}

export interface ConvertFromQuotePayload {
  name?: string;
  description?: string;
  projectManagerId?: string;
  teamMembers?: Array<{ userId: string; roleName: string; isProjectManager?: boolean }>;
  startDate?: string;
  endDate?: string;
  priority?: ProjectPriority;
  excludedTaskTemplateIds?: string[];
}

interface ProjectResponse {
  id: string;
  projectNumber: string;
  name: string;
  [key: string]: unknown;
}

export function useInitiateProject() {
  const { user } = useAuth();
  const organizationId = user?.organizationId;
  const queryClient = useQueryClient();

  return useMutation<ProjectResponse, AxiosError, InitiateProjectPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<ProjectResponse>(
        '/projects/initiate',
        payload,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['quotes'] });
      void queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}

export function useConvertFromQuote() {
  const { user } = useAuth();
  const organizationId = user?.organizationId;
  const queryClient = useQueryClient();

  return useMutation<
    ProjectResponse,
    AxiosError,
    { quoteId: string; payload: ConvertFromQuotePayload }
  >({
    mutationFn: async ({ quoteId, payload }) => {
      const { data } = await apiClient.post<ProjectResponse>(
        `/projects/convert-from-quote/${quoteId}`,
        payload,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['quotes'] });
      void queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}

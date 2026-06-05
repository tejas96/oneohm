'use client';

import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

export interface ProjectChatMessage {
  id: string;
  projectId: string;
  senderId: string;
  messageText: string;
  sender: {
    id: string;
    firstName: string;
    lastName?: string;
    roleType?: 'customer' | 'team';
  };
  createdAt: string;
}

export function useProjectChatMessages(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<ProjectChatMessage[], AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: ['project', projectId, 'chat'],
    queryFn: async (): Promise<ProjectChatMessage[]> => {
      const { data } = await apiClient.get<ProjectChatMessage[]>(`/projects/${projectId}/chat`, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return data;
    },
    enabled: !!projectId && options?.enabled !== false,
    refetchInterval: 5000, // Poll every 5 seconds
    staleTime: 4000,
  });
}

export function useSendProjectChatMessage(projectId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async (messageText: string): Promise<ProjectChatMessage> => {
      const { data } = await apiClient.post<ProjectChatMessage>(
        `/projects/${projectId}/chat`,
        { messageText },
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project', projectId, 'chat'] });
    },
  });
}

'use client';

import type { MyTask, TaskChecklist, TaskPriority, TaskStatus } from '@oneohm-epc/shared-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { taskDetailKeys } from './use-task-detail';
import { myTaskKeys } from '../../projects/hooks';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

interface UpdateTaskPayload {
  taskId: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  endDate?: string;
  startDate?: string;
  assignedToUserId?: string | null;
  description?: string;
  completionPercentage?: number;
  checklist?: TaskChecklist;
  dependsOnTaskIds?: string[];
  version?: number;
}

export function useUpdateTask() {
  const { user } = useAuth();
  const organizationId = user?.organizationId;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, ...payload }: UpdateTaskPayload) => {
      const { data } = await apiClient.patch<MyTask>(`/tasks/${taskId}`, payload, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return data;
    },
    onSuccess: (_data, variables) => {
      if (variables.status) {
        showToast.success('Task status updated');
      } else if (variables.priority) {
        showToast.success('Task priority updated');
      } else if (variables.assignedToUserId !== undefined) {
        showToast.success('Task reassigned');
      } else if (variables.endDate !== undefined) {
        showToast.success('Due date updated');
      } else if (variables.description !== undefined) {
        showToast.success('Description updated');
      } else if (variables.checklist !== undefined) {
        showToast.success('Checklist updated');
      } else if (variables.dependsOnTaskIds !== undefined) {
        showToast.success('Dependencies updated');
      } else {
        showToast.success('Task updated');
      }
      void queryClient.invalidateQueries({ queryKey: myTaskKeys.all(organizationId) });
      void queryClient.invalidateQueries({
        queryKey: taskDetailKeys.detail(organizationId, variables.taskId),
      });
    },
    onError: (error) => {
      showToast.error(getErrorMessage(error));
    },
  });
}

export function useAddComment() {
  const { user } = useAuth();
  const organizationId = user?.organizationId;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, comment }: { taskId: string; comment: string }) => {
      await apiClient.post(
        `/tasks/${taskId}/comments`,
        { comment },
        { headers: { 'X-Organization-Id': organizationId } },
      );
    },
    onSuccess: (_data, variables) => {
      showToast.success('Comment added');
      void queryClient.invalidateQueries({
        queryKey: taskDetailKeys.detail(organizationId, variables.taskId),
      });
    },
    onError: (error) => {
      showToast.error(getErrorMessage(error));
    },
  });
}

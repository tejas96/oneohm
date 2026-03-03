'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { workflowStepKeys } from './use-workflow-steps';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

interface SaveStepPayload {
  id?: string;
  name: string;
  code: string;
  description?: string;
  type?: string;
  defaultRoleCode?: string;
  defaultDepartment?: string;
  defaultMilestoneType?: string;
  sequenceOrder: number;
  estimatedDurationHours?: number;
  isMandatory: boolean;
  canRunParallel: boolean;
  dependsOnTaskCodes?: string[];
  checklistTemplate?: unknown;
  allowedTransitions?: Record<string, string[]>;
  organizationId?: string;
}

export function useToggleWorkflowStep() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(
        `/workflow-steps/${id}/toggle-status`,
        {},
        {
          headers: { 'X-Organization-Id': organizationId },
        },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowStepKeys.all(organizationId) });
      showToast.success('Step status toggled');
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });
}

export function useDeleteWorkflowStep() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/workflow-steps/${id}`, {
        headers: { 'X-Organization-Id': organizationId },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowStepKeys.all(organizationId) });
      showToast.success('Step deleted');
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });
}

export function useSaveWorkflowStep(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async (payload: SaveStepPayload) => {
      const { id, ...data } = payload;
      const headers = { 'X-Organization-Id': organizationId };

      if (id) {
        await apiClient.patch(`/workflow-steps/${id}`, data, { headers });
      } else {
        await apiClient.post('/workflow-steps', { ...data, organizationId }, { headers });
      }
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: workflowStepKeys.all(organizationId) });
      showToast.success(variables.id ? 'Step updated' : 'Step created');
      options?.onSuccess?.();
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });
}

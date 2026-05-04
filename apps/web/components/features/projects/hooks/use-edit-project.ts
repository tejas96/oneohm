'use client';

import type { ProjectPriority } from '@oneohm-epc/shared/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { projectDetailKeys } from './use-project-detail';
import { projectKeys } from './use-projects';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { useOrgContext } from '@/lib/hooks/core';
import type { ProjectTaskItem } from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils/error';

// ── Payload Types ──────────────────────────────────────────────

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  priority?: ProjectPriority;
  startDate?: string;
  endDate?: string;
}

export interface AddTeamMemberPayload {
  userId: string;
  roleName: string;
  isProjectManager?: boolean;
}

export interface UpdateTeamMemberPayload {
  /** The team membership record ID (not userId). */
  memberId: string;
  roleName?: string;
  isProjectManager?: boolean;
}

export interface RemoveTeamMemberPayload {
  /** The team membership record ID (not userId). */
  memberId: string;
}

export interface ReassignTaskPayload {
  taskId: string;
  assignedToUserId: string;
}

// ── Hook: member task checker ──────────────────────────────────

/**
 * Fetches tasks assigned to a specific user in this project only.
 * Used to determine whether a member can be safely removed.
 */
export function useProjectMemberTasks(
  projectId: string,
  userId: string,
  options?: { enabled?: boolean },
): {
  data: ProjectTaskItem[] | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const { orgHeaders, organizationId } = useOrgContext();

  const query = useQuery<ProjectTaskItem[]>({
    queryKey: [...projectDetailKeys.tasks(organizationId, projectId), 'byAssignee', userId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: ProjectTaskItem[] }>(
        `/projects/${projectId}/tasks?assignedToUserId=${encodeURIComponent(userId)}&limit=200`,
        { headers: orgHeaders },
      );
      return data.data ?? [];
    },
    enabled: !!projectId && !!userId && !!organizationId && options?.enabled !== false,
    staleTime: 0,
  });

  return { data: query.data, isLoading: query.isLoading, isError: query.isError };
}

// ── Hook: edit project mutations ───────────────────────────────

export interface UseEditProjectReturn {
  updateProject: (payload: UpdateProjectPayload) => Promise<void>;
  addTeamMember: (payload: AddTeamMemberPayload) => Promise<void>;
  updateTeamMember: (payload: UpdateTeamMemberPayload) => Promise<void>;
  removeTeamMember: (payload: RemoveTeamMemberPayload) => Promise<void>;
  reassignTask: (payload: ReassignTaskPayload) => Promise<void>;
  isUpdatingProject: boolean;
  isAddingMember: boolean;
  isRemovingMember: boolean;
  isReassigningTask: boolean;
}

export function useEditProject(projectId: string): UseEditProjectReturn {
  const { orgHeaders, organizationId } = useOrgContext();
  const queryClient = useQueryClient();

  // ── Update project details ───────────────────────────────────

  const updateProjectMutation = useMutation({
    mutationFn: async (payload: UpdateProjectPayload) => {
      await apiClient.patch(`/projects/${projectId}`, payload, { headers: orgHeaders });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: projectDetailKeys.detail(organizationId, projectId),
      });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists(organizationId) });
    },
    onError: (error) => {
      showToast.error(getErrorMessage(error));
    },
  });

  // ── Add team member ──────────────────────────────────────────

  const addTeamMemberMutation = useMutation({
    mutationFn: async (payload: AddTeamMemberPayload) => {
      await apiClient.post(`/projects/${projectId}/team`, payload, { headers: orgHeaders });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: projectDetailKeys.team(organizationId, projectId),
      });
    },
    onError: (error) => {
      showToast.error(getErrorMessage(error));
    },
  });

  // ── Update team member (role / PM status) ───────────────────

  const updateTeamMemberMutation = useMutation({
    mutationFn: async ({ memberId, ...rest }: UpdateTeamMemberPayload) => {
      await apiClient.patch(`/projects/${projectId}/team/${memberId}`, rest, {
        headers: orgHeaders,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: projectDetailKeys.team(organizationId, projectId),
      });
    },
    onError: (error) => {
      showToast.error(getErrorMessage(error));
    },
  });

  // ── Remove team member ───────────────────────────────────────

  const removeTeamMemberMutation = useMutation({
    mutationFn: async ({ memberId }: RemoveTeamMemberPayload) => {
      await apiClient.delete(`/projects/${projectId}/team/${memberId}`, { headers: orgHeaders });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: projectDetailKeys.team(organizationId, projectId),
      });
    },
    onError: (error) => {
      showToast.error(getErrorMessage(error));
    },
  });

  // ── Reassign task ────────────────────────────────────────────

  const reassignTaskMutation = useMutation({
    mutationFn: async ({ taskId, assignedToUserId }: ReassignTaskPayload) => {
      await apiClient.patch(
        `/projects/${projectId}/tasks/${taskId}`,
        { assignedToUserId },
        { headers: orgHeaders },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: projectDetailKeys.tasks(organizationId, projectId),
      });
    },
    onError: (error) => {
      showToast.error(getErrorMessage(error));
    },
  });

  // ── Public API ───────────────────────────────────────────────

  async function updateProject(payload: UpdateProjectPayload): Promise<void> {
    await updateProjectMutation.mutateAsync(payload);
  }

  async function addTeamMember(payload: AddTeamMemberPayload): Promise<void> {
    await addTeamMemberMutation.mutateAsync(payload);
  }

  async function updateTeamMember(payload: UpdateTeamMemberPayload): Promise<void> {
    await updateTeamMemberMutation.mutateAsync(payload);
  }

  async function removeTeamMember(payload: RemoveTeamMemberPayload): Promise<void> {
    await removeTeamMemberMutation.mutateAsync(payload);
  }

  async function reassignTask(payload: ReassignTaskPayload): Promise<void> {
    await reassignTaskMutation.mutateAsync(payload);
  }

  return {
    updateProject,
    addTeamMember,
    updateTeamMember,
    removeTeamMember,
    reassignTask,
    isUpdatingProject: updateProjectMutation.isPending,
    isAddingMember: addTeamMemberMutation.isPending,
    isRemovingMember: removeTeamMemberMutation.isPending,
    isReassigningTask: reassignTaskMutation.isPending,
  };
}

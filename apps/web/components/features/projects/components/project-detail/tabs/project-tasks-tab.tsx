'use client';

import { LookupTypeCode, type TaskPriority, type TaskStatus } from '@oneohm-epc/shared/types';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import React, { useCallback, useMemo, useState } from 'react';

import { TaskListTable, TaskListToolbar } from './task-list';
import {
  TASK_LIST_FILTER_DEFAULTS,
  TASKS_PAGE_SIZE,
  PROJECT_TASKS_QUERY_KEY,
  type TaskListFilters,
} from '../../../constants';
import {
  type TeamMemberSummary,
  useProjectTaskList,
  useProjectTaskStatuses,
  useProjectTeam,
} from '../../../hooks';
import type { ProjectDetail } from '../../../hooks/types';

import { TaskDrawer } from '@/components/features/tasks';
import { useUpdateTask } from '@/components/features/tasks/hooks';
import { TablePagination } from '@/components/shared/data-table/pagination';
import { ErrorState } from '@/components/shared/feedback/empty-state';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/sonner';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useOrgContext } from '@/lib/hooks/core';
import { useLookupOptions } from '@/lib/hooks/resources';
import { useUrlFilters } from '@/lib/hooks/use-url-filters';
import { getErrorMessage } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

interface ProjectTasksTabProps {
  projectId: string;
  project: ProjectDetail;
  isActive: boolean;
}

export const ProjectTasksTab = React.memo(
  ({ projectId, project, isActive }: ProjectTasksTabProps): React.JSX.Element => {
    const { user } = useAuth();
    const { organizationId } = useOrgContext();
    const queryClient = useQueryClient();

    const { filters, setFilter, clearFilters } =
      useUrlFilters<TaskListFilters>(TASK_LIST_FILTER_DEFAULTS);
    const page = Math.max(1, parseInt(filters.t_page, 10) || 1);

    const { taskStatuses, isLoading: statusesLoading } = useProjectTaskStatuses(projectId);
    const { items: priorityOptions } = useLookupOptions(LookupTypeCode.PRIORITY, isActive);

    const {
      data: taskListData,
      isLoading,
      isError,
      error,
      refetch,
    } = useProjectTaskList(
      projectId,
      {
        page,
        limit: TASKS_PAGE_SIZE,
        status: filters.t_status || undefined,
        priority: filters.t_priority || undefined,
        assignedToUserId: filters.t_assignee || undefined,
        milestoneId: filters.t_milestone || undefined,
        search: filters.t_search || undefined,
      },
      { enabled: isActive },
    );

    const { data: team } = useProjectTeam(projectId, { enabled: isActive });

    // useUpdateTask handles toasts and myTaskKeys invalidation internally.
    // We only need to additionally bust the project-tasks list after success.
    const { mutate: updateTaskMutate } = useUpdateTask();

    const invalidateProjectTasks = useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: PROJECT_TASKS_QUERY_KEY(organizationId) });
    }, [queryClient, organizationId]);

    const avatarMembers: TeamMemberSummary[] = useMemo(() => {
      if (!team) return [];
      const mapped = team.map((m) => ({
        id: m.userId,
        firstName: m.user?.firstName ?? 'Unknown',
        lastName: m.user?.lastName,
        isProjectManager: m.isProjectManager,
      }));
      const currentUserId = user?.id;
      return mapped.sort((a, b) => {
        if (a.id === currentUserId) return -1;
        if (b.id === currentUserId) return 1;
        return 0;
      });
    }, [team, user?.id]);

    // Drawer state
    const [openTaskId, setOpenTaskId] = useState<string | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const handleOpenTask = useCallback((taskId: string) => {
      setOpenTaskId(taskId);
      setDrawerOpen(true);
    }, []);

    const handleCloseDrawer = useCallback(() => {
      setDrawerOpen(false);
    }, []);

    const handleStatusChange = useCallback(
      (taskId: string, status: string) => {
        updateTaskMutate(
          { taskId, status: status as TaskStatus },
          { onSuccess: invalidateProjectTasks },
        );
      },
      [updateTaskMutate, invalidateProjectTasks],
    );

    const handlePriorityChange = useCallback(
      (taskId: string, priority: string) => {
        updateTaskMutate(
          { taskId, priority: priority as TaskPriority },
          { onSuccess: invalidateProjectTasks },
        );
      },
      [updateTaskMutate, invalidateProjectTasks],
    );

    const hasActiveFilters =
      !!filters.t_search ||
      !!filters.t_status ||
      !!filters.t_priority ||
      !!filters.t_assignee ||
      !!filters.t_milestone;

    if (isError) {
      return (
        <ErrorState
          title="Failed to load tasks"
          description={getErrorMessage(error)}
          onRetry={() => refetch()}
        />
      );
    }

    const tasks = taskListData?.data ?? [];
    const meta = taskListData?.meta;

    return (
      <>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Project Tasks</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={buildRoute(ROUTES.PROJECTS.BOARD, undefined, { project: projectId })}>
                  Open Board
                </Link>
              </Button>
              <Button size="sm" onClick={() => showToast.info('Coming Soon')}>
                + Add Task
              </Button>
            </div>
          </div>

          {/* Toolbar */}
          <TaskListToolbar
            filters={filters}
            setFilter={setFilter}
            clearFilters={clearFilters}
            taskStatuses={taskStatuses}
            priorityOptions={priorityOptions}
            avatarMembers={avatarMembers}
            milestones={project.milestones ?? []}
            totalTasks={meta?.total}
          />

          {/* Table */}
          <TaskListTable
            tasks={tasks}
            taskStatuses={taskStatuses}
            project={project}
            isLoading={isLoading || statusesLoading}
            onOpenTask={handleOpenTask}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <TablePagination
              currentPage={page}
              totalPages={meta.totalPages}
              totalItems={meta.total}
              itemLabel="tasks"
              pageSize={TASKS_PAGE_SIZE}
              variant="simple"
              onPageChange={(p) => setFilter('t_page', String(p))}
            />
          )}
        </div>

        {/* Task Drawer */}
        <TaskDrawer
          taskId={openTaskId}
          open={drawerOpen}
          onClose={handleCloseDrawer}
          onTaskUpdated={invalidateProjectTasks}
        />
      </>
    );
  },
);

ProjectTasksTab.displayName = 'ProjectTasksTab';

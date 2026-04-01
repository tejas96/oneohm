'use client';

import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Box, Divider } from '@mui/material';
import {
  TASK_STATUS_TRANSITIONS,
  TaskStatus,
  type TaskChecklist,
  type TaskPriority,
} from '@oneohm-epc/shared/types';
import { useCallback } from 'react';

import { TaskDrawerChecklist } from './task-drawer-checklist';
import { TaskDrawerDependencies } from './task-drawer-dependencies';
import { TaskDrawerHeader } from './task-drawer-header';
import { TaskDrawerMainContent } from './task-drawer-main-content';
import { TaskDrawerMetadata } from './task-drawer-metadata';
import { useTaskDetail } from '../hooks/use-task-detail';
import { useAddComment, useUpdateTask } from '../hooks/use-task-mutations';

import { Button } from '@/components/ui/button';
import { MUITypography } from '@/components/ui/mui-typography';
import { Sheet, SheetContent, SheetFooter, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

interface TaskDrawerProps {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
  onTaskUpdated?: () => void;
}

export function TaskDrawer({
  taskId,
  open,
  onClose,
  onTaskUpdated,
}: TaskDrawerProps): React.JSX.Element {
  const { data: task, isLoading, isError, error } = useTaskDetail(open ? taskId : null);
  const updateTask = useUpdateTask();
  const addComment = useAddComment();

  const handleStatusChange = useCallback(
    (status: TaskStatus) => {
      if (!taskId) return;
      updateTask.mutate(
        { taskId, status, version: task?.version },
        { onSuccess: () => onTaskUpdated?.() },
      );
    },
    [taskId, task?.version, updateTask, onTaskUpdated],
  );

  const handlePriorityChange = useCallback(
    (priority: TaskPriority) => {
      if (!taskId) return;
      updateTask.mutate(
        { taskId, priority, version: task?.version },
        { onSuccess: () => onTaskUpdated?.() },
      );
    },
    [taskId, task?.version, updateTask, onTaskUpdated],
  );

  const handleComplete = useCallback(() => {
    if (!taskId) return;
    updateTask.mutate(
      { taskId, status: TaskStatus.DONE, version: task?.version },
      {
        onSuccess: () => {
          onTaskUpdated?.();
          onClose();
        },
      },
    );
  }, [taskId, task?.version, updateTask, onTaskUpdated, onClose]);

  const handleDueDateChange = useCallback(
    (endDate: string | undefined) => {
      if (!taskId) return;
      updateTask.mutate(
        { taskId, endDate: endDate ?? '', version: task?.version },
        { onSuccess: () => onTaskUpdated?.() },
      );
    },
    [taskId, task?.version, updateTask, onTaskUpdated],
  );

  const handleAssigneeChange = useCallback(
    (assignedToUserId: string | null) => {
      if (!taskId) return;
      updateTask.mutate(
        { taskId, assignedToUserId, version: task?.version },
        { onSuccess: () => onTaskUpdated?.() },
      );
    },
    [taskId, task?.version, updateTask, onTaskUpdated],
  );

  const handleDescriptionChange = useCallback(
    (description: string) => {
      if (!taskId) return;
      updateTask.mutate(
        { taskId, description, version: task?.version },
        { onSuccess: () => onTaskUpdated?.() },
      );
    },
    [taskId, task?.version, updateTask, onTaskUpdated],
  );

  const handleChecklistToggle = useCallback(
    (checklist: TaskChecklist) => {
      if (!taskId) return;
      updateTask.mutate(
        { taskId, checklist, version: task?.version },
        { onSuccess: () => onTaskUpdated?.() },
      );
    },
    [taskId, task?.version, updateTask, onTaskUpdated],
  );

  const handleDependenciesChange = useCallback(
    (dependsOnTaskIds: string[]) => {
      if (!taskId) return;
      updateTask.mutate(
        { taskId, dependsOnTaskIds, version: task?.version },
        { onSuccess: () => onTaskUpdated?.() },
      );
    },
    [taskId, task?.version, updateTask, onTaskUpdated],
  );

  const handleAddComment = useCallback(
    (comment: string) => {
      if (!taskId) return;
      addComment.mutate({ taskId, comment });
    },
    [taskId, addComment],
  );

  const canComplete = task
    ? (TASK_STATUS_TRANSITIONS[task.status] ?? []).includes(TaskStatus.DONE)
    : false;

  if (!open) {
    return (
      <Sheet open={false}>
        <SheetContent side="right" className="w-full sm:max-w-4xl">
          <SheetTitle className="sr-only">Task Details</SheetTitle>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-4xl flex flex-col p-0">
        <SheetTitle className="sr-only">{task?.name ?? 'Task Details'}</SheetTitle>
        {isError ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              p: 3,
              pt: 8,
              textAlign: 'center',
            }}
          >
            <ErrorOutlineIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
            <Box>
              <MUITypography variant="bodyPrimary" sx={{ fontWeight: 500, mb: 0.5 }}>
                {[403, 404].includes(
                  (error as { response?: { status?: number } })?.response?.status ?? 0,
                )
                  ? 'Access Denied'
                  : 'Failed to load task'}
              </MUITypography>
              <MUITypography variant="body">
                {[403, 404].includes(
                  (error as { response?: { status?: number } })?.response?.status ?? 0,
                )
                  ? "You don't have permission to view this task's details"
                  : 'Something went wrong. Please try again later.'}
              </MUITypography>
            </Box>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </Box>
        ) : isLoading || !task ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-24" />
            <div className="space-y-3 pt-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <TaskDrawerHeader
              projectId={task.projectId}
              projectNumber={task.projectNumber}
              code={task.code}
              name={task.name}
            />

            {/* Two-column layout: Metadata sidebar (left) + Main content (right) */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '300px 1fr' }}>
                {/* Metadata sidebar */}
                <Box sx={{ borderRight: 1, borderColor: 'divider', px: 2.5, py: 2.5, bgcolor: 'action.hover' }}>
                  <TaskDrawerMetadata
                    projectId={task.projectId}
                    projectNumber={task.projectNumber}
                    projectName={task.projectName}
                    status={task.status}
                    priority={task.priority}
                    assignedToUserId={task.assignedToUserId}
                    endDate={task.endDate}
                    createdAt={task.createdAt}
                    updatedAt={task.updatedAt}
                    onStatusChange={handleStatusChange}
                    onPriorityChange={handlePriorityChange}
                    onAssigneeChange={handleAssigneeChange}
                    onDueDateChange={handleDueDateChange}
                  />
                </Box>

                {/* Main content area */}
                <Box sx={{ px: 3, py: 2.5 }}>
                  <TaskDrawerMainContent
                    description={task.description}
                    activityLog={task.activityLog ?? []}
                    blockedReason={task.blockedReason}
                    completionPercentage={task.completionPercentage}
                    hasDependencyBlockers={task.hasDependencyBlockers}
                    onDescriptionChange={handleDescriptionChange}
                    onAddComment={handleAddComment}
                    isAddingComment={addComment.isPending}
                    hasExtraSections={
                      (task.checklist?.items?.length ?? 0) > 0 ||
                      (task.dependsOnTaskIds?.length ?? 0) > 0 ||
                      Boolean(task.hasDependencyBlockers)
                    }
                  >
                    {/* Checklist — shown before activity */}
                    {task.checklist && task.checklist.items && task.checklist.items.length > 0 && (
                      <Box>
                        <MUITypography variant="sectionTitle" sx={{ mb: 1.5 }}>
                          Checklist
                        </MUITypography>
                        <TaskDrawerChecklist
                          checklist={task.checklist}
                          onToggleItem={handleChecklistToggle}
                        />
                      </Box>
                    )}

                    {/* Divider between checklist and dependencies when both are present */}
                    {(task.checklist?.items?.length ?? 0) > 0 &&
                      ((task.dependsOnTaskIds?.length ?? 0) > 0 || task.hasDependencyBlockers) && (
                        <Divider />
                      )}

                    {/* Dependencies — shown before activity */}
                    {((task.dependsOnTaskIds && task.dependsOnTaskIds.length > 0) ||
                      task.hasDependencyBlockers) && (
                      <Box>
                        <MUITypography variant="sectionTitle" sx={{ mb: 1.5 }}>
                          Dependencies
                        </MUITypography>
                        <TaskDrawerDependencies
                          task={task}
                          onDependenciesChange={handleDependenciesChange}
                        />
                      </Box>
                    )}
                  </TaskDrawerMainContent>
                </Box>
              </Box>
            </Box>

            {canComplete && (
              <SheetFooter className="border-t border-border-light p-4 bg-white">
                <Button className="w-full" onClick={handleComplete} disabled={updateTask.isPending}>
                  Complete Task
                </Button>
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

'use client';

import CheckIcon from '@mui/icons-material/Check';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Box } from '@mui/material';
import { TaskStatus, type TaskChecklist, type TaskPriority } from '@tejas96/shared/types';
import { useCallback } from 'react';

import { TaskDrawerChecklist } from './task-drawer-checklist';
import { TaskDrawerDependencies } from './task-drawer-dependencies';
import { TaskDrawerHeader } from './task-drawer-header';
import { TaskDrawerMainContent, SectionHeading } from './task-drawer-main-content';
import { TaskDrawerMetadata } from './task-drawer-metadata';
import { useProjectTaskStatuses } from '../../projects/hooks/use-project-task-statuses';
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
  const { taskStatuses, isLoading: statusesLoading } = useProjectTaskStatuses(task?.projectId);

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

      // Derive completionPercentage from checklist completion ratio, but only when
      // the task is in an active (non-final) status. Final statuses (done/cancelled)
      // are auto-set to 100% by the backend and should not be overridden by checklist math.
      const isFinalStatus =
        task?.status === TaskStatus.DONE || task?.status === TaskStatus.CANCELLED;
      const completionPercentage =
        !isFinalStatus && checklist.items.length > 0
          ? Math.round(
              (checklist.items.filter((i) => i.isCompleted).length / checklist.items.length) * 100,
            )
          : undefined;

      updateTask.mutate(
        { taskId, checklist, completionPercentage, version: task?.version },
        { onSuccess: () => onTaskUpdated?.() },
      );
    },
    [taskId, task?.status, task?.version, updateTask, onTaskUpdated],
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

  const canComplete = task ? task.status !== TaskStatus.DONE && !task.hasDependencyBlockers : false;

  // Surfaced in the footer so the checklist isn't silently skipped on complete.
  const openChecklistCount = task?.checklist?.items.filter((item) => !item.isCompleted).length ?? 0;

  if (!open) {
    return (
      <Sheet open={false}>
        <SheetContent side="right" className="w-full sm:max-w-4xl">
          <SheetTitle className="sr-only">Task details</SheetTitle>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-4xl flex flex-col p-0">
        <SheetTitle className="sr-only">{task?.name ?? 'Task details'}</SheetTitle>
        {isError ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              px: 3,
              py: 10,
              textAlign: 'center',
            }}
          >
            {(() => {
              const status =
                (error as { response?: { status?: number } } | null)?.response?.status ?? 0;
              const isAccessDenied = [403, 404].includes(status);
              return (
                <>
                  {/* Signature circular icon container */}
                  <Box
                    aria-hidden="true"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      color: 'var(--ds-text-tertiary)',
                      bgcolor: 'var(--ds-canvas-sunken)',
                    }}
                  >
                    <ErrorOutlineIcon sx={{ fontSize: 24 }} />
                  </Box>
                  <Box sx={{ maxWidth: 340 }}>
                    <MUITypography variant="bodyPrimary" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {isAccessDenied
                        ? 'You don’t have access to this task'
                        : 'Couldn’t load this task'}
                    </MUITypography>
                    <MUITypography variant="body" sx={{ color: 'var(--ds-text-secondary)' }}>
                      {isAccessDenied
                        ? 'Ask a project admin to add you to the project, then reopen it.'
                        : 'The request didn’t come back. Close this and open the task again.'}
                    </MUITypography>
                  </Box>
                  <Button variant="outline" size="sm" onClick={onClose}>
                    Close
                  </Button>
                </>
              );
            })()}
          </Box>
        ) : isLoading || !task ? (
          <div className="space-y-5 p-6">
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-6 w-64" />
            </div>
            <div className="grid gap-6 md:grid-cols-[288px_1fr]">
              <div className="space-y-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-2.5 w-16" />
                    <Skeleton className="h-8 w-full rounded-lg" />
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-3/4" />
              </div>
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

            {/* Two-column layout: Metadata sidebar (left) + Main content (right).
                Stacks below `md` so the drawer stays usable at phone width. */}
            <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'var(--ds-surface)' }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '288px 1fr' },
                  alignItems: 'start',
                  minHeight: '100%',
                }}
              >
                {/* Metadata sidebar — separated by luminance, not a border */}
                <Box
                  sx={{
                    px: 2.5,
                    py: 2.5,
                    bgcolor: 'var(--ds-canvas-sunken)',
                    alignSelf: 'stretch',
                  }}
                >
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
                    taskStatuses={taskStatuses}
                    statusesLoading={statusesLoading}
                    hasDependencyBlockers={task.hasDependencyBlockers}
                    onStatusChange={handleStatusChange}
                    onPriorityChange={handlePriorityChange}
                    onAssigneeChange={handleAssigneeChange}
                    onDueDateChange={handleDueDateChange}
                  />
                </Box>

                {/* Main content area */}
                <Box sx={{ px: 3, py: 2.5, minWidth: 0 }}>
                  <TaskDrawerMainContent
                    description={task.description}
                    activityLog={task.activityLog}
                    blockedReason={task.blockedReason}
                    completionPercentage={task.completionPercentage}
                    hasDependencyBlockers={task.hasDependencyBlockers}
                    onDescriptionChange={handleDescriptionChange}
                    onAddComment={handleAddComment}
                    isAddingComment={addComment.isPending}
                    hasExtraSections={
                      (task.checklist?.items.length ?? 0) > 0 ||
                      (task.dependsOnTaskIds?.length ?? 0) > 0 ||
                      Boolean(task.hasDependencyBlockers)
                    }
                  >
                    {/* Checklist — shown before activity */}
                    {task.checklist?.items && task.checklist.items.length > 0 && (
                      <Box>
                        <SectionHeading>Checklist</SectionHeading>
                        <TaskDrawerChecklist
                          checklist={task.checklist}
                          onToggleItem={handleChecklistToggle}
                        />
                      </Box>
                    )}

                    {/* Dependencies — brings its own heading and "Link a task" action */}
                    {((task.dependsOnTaskIds && task.dependsOnTaskIds.length > 0) ||
                      task.hasDependencyBlockers) && (
                      <TaskDrawerDependencies
                        task={task}
                        onDependenciesChange={handleDependenciesChange}
                      />
                    )}
                  </TaskDrawerMainContent>
                </Box>
              </Box>
            </Box>

            {canComplete && (
              <SheetFooter className="flex-col items-stretch gap-2 bg-background px-6 py-3 shadow-[0_-1px_0_var(--ds-canvas-sunken)] sm:flex-row sm:items-center sm:justify-between sm:space-x-0">
                {/* Left slot keeps the bar balanced and earns its height */}
                <p className="text-2xs text-foreground-tertiary">
                  {openChecklistCount > 0
                    ? `${openChecklistCount} checklist ${openChecklistCount === 1 ? 'item is' : 'items are'} still open`
                    : 'Closes the task and stops it appearing in My tasks'}
                </p>
                <Button
                  size="lg"
                  loading={updateTask.isPending}
                  onClick={handleComplete}
                  className="w-full shrink-0 sm:w-auto sm:min-w-[152px]"
                >
                  {!updateTask.isPending && <CheckIcon />}
                  Mark complete
                </Button>
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

'use client';

import {
  TASK_STATUS_TRANSITIONS,
  TaskStatus,
  type TaskChecklist,
  type TaskPriority,
} from '@oneohm-epc/shared/types';
import { AlertCircle } from 'lucide-react';
import { useCallback, useState } from 'react';

import { DRAWER_TABS, type DrawerTab } from '../constants';
import { TaskDrawerActivity } from './task-drawer-activity';
import { TaskDrawerChecklist } from './task-drawer-checklist';
import { TaskDrawerDependencies } from './task-drawer-dependencies';
import { TaskDrawerDetails } from './task-drawer-details';
import { TaskDrawerHeader } from './task-drawer-header';
import { useTaskDetail } from '../hooks/use-task-detail';
import { useAddComment, useUpdateTask } from '../hooks/use-task-mutations';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetFooter, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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
  const [activeTab, setActiveTab] = useState<DrawerTab>('details');
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
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetTitle className="sr-only">Task Details</SheetTitle>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetTitle className="sr-only">{task?.name ?? 'Task Details'}</SheetTitle>
        {isError ? (
          <div className="flex flex-col items-center justify-center gap-3 p-6 pt-16 text-center">
            <AlertCircle className="h-10 w-10 text-foreground-muted" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {[403, 404].includes(
                  (error as { response?: { status?: number } })?.response?.status ?? 0,
                )
                  ? 'Access Denied'
                  : 'Failed to load task'}
              </p>
              <p className="mt-1 text-xs text-foreground-secondary">
                {[403, 404].includes(
                  (error as { response?: { status?: number } })?.response?.status ?? 0,
                )
                  ? "You don't have permission to view this task's details"
                  : 'Something went wrong. Please try again later.'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
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
            <div className="px-6 pt-6">
              <TaskDrawerHeader
                projectNumber={task.projectNumber}
                code={task.code}
                name={task.name}
                status={task.status}
                priority={task.priority}
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
              />
            </div>

            {/* Tab navigation */}
            <div className="flex border-b border-border-light px-6">
              {DRAWER_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    'px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                    activeTab === tab.value
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-foreground-tertiary hover:text-foreground-secondary',
                  )}
                >
                  {tab.label}
                  {tab.value === 'checklist' && task.checklistProgress && (
                    <span className="ml-1 text-2xs text-foreground-muted">
                      ({task.checklistProgress.done}/{task.checklistProgress.total})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {activeTab === 'details' && (
                <>
                  <TaskDrawerDetails
                    task={task}
                    onDueDateChange={handleDueDateChange}
                    onAssigneeChange={handleAssigneeChange}
                    onDescriptionChange={handleDescriptionChange}
                  />
                  <div className="mt-4 pt-4 border-t border-border-light">
                    <TaskDrawerDependencies
                      task={task}
                      onDependenciesChange={handleDependenciesChange}
                    />
                  </div>
                </>
              )}
              {activeTab === 'checklist' && (
                <TaskDrawerChecklist
                  checklist={task.checklist}
                  onToggleItem={handleChecklistToggle}
                />
              )}
              {activeTab === 'activity' && (
                <TaskDrawerActivity
                  activityLog={task.activityLog ?? []}
                  onAddComment={handleAddComment}
                  isAddingComment={addComment.isPending}
                />
              )}
            </div>

            {canComplete && (
              <SheetFooter className="border-t border-border-light p-4">
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

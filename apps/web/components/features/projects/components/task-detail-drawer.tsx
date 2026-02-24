'use client';

import { TASK_STATUS_TRANSITIONS, TaskStatus } from '@oneohm-epc/shared-types';
import { Calendar, FolderKanban, User } from 'lucide-react';
import Link from 'next/link';

import {
  getDueDateColor,
  TASK_PRIORITY_BADGE_VARIANT,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_BADGE_VARIANT,
  TASK_STATUS_LABELS,
} from '../constants';
import type { MyTask } from '../hooks';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ROUTES } from '@/lib/config/routes';
import { formatRelativeDate } from '@/lib/utils';

interface TaskDetailDrawerProps {
  task: MyTask | null;
  open: boolean;
  onClose: () => void;
  onComplete: (taskId: string) => void;
}

export function TaskDetailDrawer({
  task,
  open,
  onClose,
  onComplete,
}: TaskDetailDrawerProps): React.JSX.Element {
  if (!task) {
    return (
      <Sheet open={false}>
        <SheetContent side="right" className="w-full sm:max-w-md" />
      </Sheet>
    );
  }

  const projectHref = ROUTES.PROJECTS.DETAIL.replace('[id]', task.projectId);
  const canComplete = (TASK_STATUS_TRANSITIONS[task.status] ?? []).includes(TaskStatus.DONE);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="space-y-1 pb-4 border-b border-border-light">
          <p className="text-2xs font-mono text-foreground-tertiary">
            {task.projectNumber} / {task.code}
          </p>
          <SheetTitle className="text-lg font-semibold leading-tight">
            {task.name ?? task.code ?? 'Untitled'}
          </SheetTitle>
          <div className="flex items-center gap-2 pt-1">
            <Badge
              variant={TASK_STATUS_BADGE_VARIANT[task.status] as 'info' | 'warning' | 'error' | 'secondary'}
              size="xs"
              shape="rounded"
            >
              {TASK_STATUS_LABELS[task.status]}
            </Badge>
            <Badge
              variant={TASK_PRIORITY_BADGE_VARIANT[task.priority] as 'info' | 'warning' | 'error' | 'secondary'}
              size="xs"
              shape="rounded"
            >
              {TASK_PRIORITY_LABELS[task.priority]}
            </Badge>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          {/* Details grid */}
          <div className="space-y-4">
            {/* Assignee */}
            <div className="flex items-start gap-3">
              <User className="size-4 text-foreground-tertiary mt-0.5 shrink-0" />
              <div>
                <p className="text-2xs text-foreground-tertiary">Assignee</p>
                <p className="text-sm text-foreground-secondary">You</p>
              </div>
            </div>

            {/* Project */}
            <div className="flex items-start gap-3">
              <FolderKanban className="size-4 text-foreground-tertiary mt-0.5 shrink-0" />
              <div>
                <p className="text-2xs text-foreground-tertiary">Project</p>
                <Link
                  href={projectHref}
                  className="text-sm text-primary hover:underline"
                >
                  {task.projectNumber} - {task.projectName}
                </Link>
              </div>
            </div>

            {/* Due date */}
            {task.endDate && (
              <div className="flex items-start gap-3">
                <Calendar className="size-4 text-foreground-tertiary mt-0.5 shrink-0" />
                <div>
                  <p className="text-2xs text-foreground-tertiary">Due Date</p>
                  <p className={`text-sm font-medium ${getDueDateColor(task.endDate)}`}>
                    {formatRelativeDate(task.endDate)}
                  </p>
                </div>
              </div>
            )}

            {/* Progress */}
            {task.completionPercentage > 0 && (
              <div>
                <p className="text-2xs text-foreground-tertiary mb-1.5">Progress</p>
                <div className="flex items-center gap-3">
                  <Progress value={task.completionPercentage} size="sm" className="flex-1" />
                  <span className="text-xs text-foreground-muted">{task.completionPercentage}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Description (if present) */}
          {task.description && (
            <div>
              <p className="text-2xs text-foreground-tertiary mb-1">Description</p>
              <p className="text-sm text-foreground-secondary whitespace-pre-line">
                {task.description}
              </p>
            </div>
          )}
        </div>

        {canComplete && (
          <SheetFooter className="border-t border-border-light pt-4">
            <Button
              className="w-full"
              onClick={() => onComplete(task.id)}
            >
              Complete Task
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

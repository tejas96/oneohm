'use client';

import { TASK_STATUS_TRANSITIONS, TaskStatus } from '@oneohm-epc/shared/types';
import { AlertTriangle, Check, Clock, Lock, Play } from 'lucide-react';
import Link from 'next/link';

import {
  NEXT_ACTION_HINTS,
  STALE_THRESHOLDS,
  TASK_PRIORITY_BADGE_VARIANT,
  TASK_PRIORITY_LABELS,
} from '../constants';
import type { MyTask } from '../hooks';
import { TaskStatusDropdown } from './task-status-dropdown';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { cn, formatRelativeDate, getDueDateColor } from '@/lib/utils';

interface TaskRowProps {
  task: MyTask;
  onOpenDrawer: (task: MyTask) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onMarkDone: (taskId: string) => void;
  onStartTask: (taskId: string) => void;
  isFocused?: boolean;
}

export function TaskRow({
  task,
  onOpenDrawer,
  onStatusChange,
  onMarkDone,
  onStartTask,
  isFocused,
}: TaskRowProps): React.JSX.Element {
  const projectDetailHref = buildRoute(ROUTES.PROJECTS.DETAIL, { id: task.projectId });
  const canMarkDone = (TASK_STATUS_TRANSITIONS[task.status] ?? []).includes(TaskStatus.DONE);
  const canStart = (TASK_STATUS_TRANSITIONS[task.status] ?? []).includes(TaskStatus.IN_PROGRESS);
  const isOverdue = task.isOverdue ?? false;

  const hasDependencyBlockers = task.hasDependencyBlockers;
  const staleThreshold = STALE_THRESHOLDS[task.status];
  const daysStale = task.daysSinceLastUpdate ?? 0;
  const isStale = staleThreshold !== undefined && daysStale >= staleThreshold;

  const hintText = NEXT_ACTION_HINTS[task.status];
  const blockedHint =
    task.status === TaskStatus.BLOCKED && task.blockedReason
      ? `Resolve blocker: ${task.blockedReason}`
      : hintText;

  return (
    <div
      data-task-row
      className={cn(
        'group/task flex items-center px-4 py-3 border-b border-border-light last:border-b-0 cursor-pointer transition-colors',
        isOverdue ? 'bg-error/5 hover:bg-error/10' : 'hover:bg-background-secondary',
        isFocused && 'ring-2 ring-primary ring-inset',
      )}
      onClick={() => onOpenDrawer(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDrawer(task);
        }
      }}
    >
      {/* Overdue indicator */}
      {isOverdue && <AlertTriangle className="size-3.5 text-error mr-2 shrink-0" />}
      {hasDependencyBlockers && !isOverdue && (
        <Lock className="size-3.5 text-amber-500 mr-2 shrink-0" />
      )}

      {/* Task info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={projectDetailHref}
            onClick={(e) => e.stopPropagation()}
            className="text-2xs font-mono text-foreground-tertiary hover:text-primary transition-colors"
          >
            {task.projectNumber}
          </Link>
          <span className="text-foreground-muted">/</span>
          <span className="text-2xs font-mono text-foreground-muted">{task.code}</span>
          <Badge
            variant={
              TASK_PRIORITY_BADGE_VARIANT[task.priority] as
                | 'error'
                | 'warning'
                | 'info'
                | 'secondary'
            }
            size="xs"
            shape="rounded"
          >
            {TASK_PRIORITY_LABELS[task.priority]}
          </Badge>
          {isStale && (
            <span className="inline-flex items-center gap-0.5 text-2xs text-warning">
              <Clock className="size-3" />
              {daysStale}d in status
            </span>
          )}
        </div>

        <div className="text-sm font-medium mt-0.5 truncate">
          {task.name ?? task.code ?? 'Untitled'}
        </div>

        {/* Next action hint + assignee info */}
        <div className="flex items-center gap-3 mt-0.5">
          {blockedHint && (
            <span className="text-2xs text-foreground-muted italic truncate">{blockedHint}</span>
          )}
          {task.assigneeName && (
            <span className="text-2xs text-foreground-tertiary shrink-0">{task.assigneeName}</span>
          )}
        </div>

        {task.completionPercentage > 0 && task.completionPercentage < 100 && (
          <div className="flex items-center gap-2 mt-1">
            <Progress value={task.completionPercentage} size="sm" className="w-24" />
            <span className="text-2xs text-foreground-muted">{task.completionPercentage}%</span>
          </div>
        )}
      </div>

      {/* Right side: due date + actions */}
      <div className="flex items-center gap-2 ml-3 shrink-0">
        {task.endDate && (
          <span
            className={`text-2xs font-medium whitespace-nowrap ${getDueDateColor(task.endDate)}`}
          >
            {formatRelativeDate(task.endDate)}
          </span>
        )}

        {/* Quick actions: visible on mobile, hover on desktop */}
        <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover/task:opacity-100 transition-opacity">
          <TaskStatusDropdown
            currentStatus={task.status}
            onStatusChange={(status) => onStatusChange(task.id, status)}
          />
          {canStart && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStartTask(task.id);
              }}
              className="flex items-center gap-1 rounded px-2 py-1 text-2xs text-info bg-info/10 hover:bg-info/20 transition-colors"
            >
              <Play className="size-3" />
              Start
            </button>
          )}
          {canMarkDone && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMarkDone(task.id);
              }}
              className="flex items-center gap-1 rounded px-2 py-1 text-2xs text-success bg-success/10 hover:bg-success/20 transition-colors"
            >
              <Check className="size-3" />
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

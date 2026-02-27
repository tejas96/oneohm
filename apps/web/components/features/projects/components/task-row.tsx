'use client';

import { TASK_STATUS_TRANSITIONS, TaskStatus } from '@oneohm-epc/shared-types';
import { Check } from 'lucide-react';
import Link from 'next/link';

import {
  TASK_PRIORITY_BADGE_VARIANT,
  TASK_PRIORITY_LABELS,
} from '../constants';
import type { MyTask } from '../hooks';
import { TaskStatusDropdown } from './task-status-dropdown';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ROUTES } from '@/lib/config/routes';
import { formatRelativeDate, getDueDateColor } from '@/lib/utils';

interface TaskRowProps {
  task: MyTask;
  onOpenDrawer: (task: MyTask) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onMarkDone: (taskId: string) => void;
}

export function TaskRow({
  task,
  onOpenDrawer,
  onStatusChange,
  onMarkDone,
}: TaskRowProps): React.JSX.Element {
  const projectDetailHref = ROUTES.PROJECTS.DETAIL.replace('[id]', task.projectId);
  const canMarkDone = (TASK_STATUS_TRANSITIONS[task.status] ?? []).includes(TaskStatus.DONE);

  return (
    <div
      className="group/task flex items-center px-4 py-3 border-b border-border-light last:border-b-0 cursor-pointer transition-colors hover:bg-background-secondary"
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
      {/* Task info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
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
            variant={TASK_PRIORITY_BADGE_VARIANT[task.priority] as 'error' | 'warning' | 'info' | 'secondary'}
            size="xs"
            shape="rounded"
          >
            {TASK_PRIORITY_LABELS[task.priority]}
          </Badge>
        </div>
        <div className="text-sm font-medium mt-0.5 truncate">{task.name ?? task.code ?? 'Untitled'}</div>
        {task.completionPercentage > 0 && (
          <div className="flex items-center gap-2 mt-1">
            <Progress value={task.completionPercentage} size="xs" className="w-24" />
            <span className="text-2xs text-foreground-muted">{task.completionPercentage}%</span>
          </div>
        )}
      </div>

      {/* Right side: due date + hover actions */}
      <div className="flex items-center gap-3 ml-4 shrink-0">
        {task.endDate && (
          <span className={`text-2xs font-medium whitespace-nowrap ${getDueDateColor(task.endDate)}`}>
            {formatRelativeDate(task.endDate)}
          </span>
        )}

        {/* Hover-only quick actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover/task:opacity-100 transition-opacity">
          <TaskStatusDropdown
            currentStatus={task.status}
            onStatusChange={(status) => onStatusChange(task.id, status)}
          />
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

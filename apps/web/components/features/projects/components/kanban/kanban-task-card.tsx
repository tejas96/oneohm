'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskStatus } from '@oneohm-epc/shared-types';
import { AlertTriangle, Calendar, CheckCircle2, GripVertical, Lock, User } from 'lucide-react';
import React from 'react';

import type { BoardColumnTask } from '../../hooks/use-kanban-board';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-blue-500',
  low: 'border-l-gray-400',
};

const PRIORITY_DOT_COLORS: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-gray-400',
};

interface KanbanTaskCardProps {
  task: BoardColumnTask;
  onTaskClick?: (taskId: string) => void;
  isDragOverlay?: boolean;
}

export function KanbanTaskCard({ task, onTaskClick, isDragOverlay }: KanbanTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
    disabled: isDragOverlay,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isOverdue =
    task.endDate &&
    task.status !== TaskStatus.DONE &&
    task.status !== TaskStatus.CANCELLED &&
    new Date(task.endDate) < new Date();

  const isBlocked = task.hasDependencyBlockers || task.status === TaskStatus.BLOCKED;
  const isDone = task.status === TaskStatus.DONE;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative rounded-lg border border-border bg-background p-3 shadow-sm',
        'border-l-4 transition-shadow hover:shadow-sm',
        PRIORITY_COLORS[task.priority] ?? 'border-l-gray-400',
        isDragOverlay && 'shadow-sm ring-2 ring-primary/30',
        isBlocked && 'bg-error/5',
        isDone && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-2">
        <button
          className="mt-0.5 shrink-0 cursor-grab opacity-0 group-hover:opacity-60 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-foreground-secondary" />
        </button>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'inline-block h-2 w-2 shrink-0 rounded-full',
                PRIORITY_DOT_COLORS[task.priority] ?? 'bg-gray-400',
              )}
            />
            <span className="text-xs font-medium text-foreground-secondary">{task.code}</span>
            {isDone && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />}
          </div>

          <button className="block w-full text-left" onClick={() => onTaskClick?.(task.id)}>
            <p
              className={cn(
                'text-sm font-medium text-foreground line-clamp-2',
                isDone && 'line-through text-foreground-secondary',
              )}
            >
              {task.name}
            </p>
          </button>

          {isBlocked && (
            <div className="flex items-center gap-1 rounded bg-error/5 border border-error/20 px-1.5 py-0.5">
              <Lock className="h-3 w-3 text-error" />
              <span className="text-section font-medium text-error">
                {task.status === TaskStatus.BLOCKED ? 'Blocked' : 'Blocked by dependencies'}
              </span>
            </div>
          )}

          {task.labels && task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.labels.slice(0, 3).map((label) => (
                <Badge key={label} variant="secondary" className="text-section px-1.5 py-0">
                  {label}
                </Badge>
              ))}
              {task.labels.length > 3 && (
                <span className="text-section text-foreground-secondary">
                  +{task.labels.length - 3}
                </span>
              )}
            </div>
          )}

          {task.checklistProgress && task.checklistProgress.total > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="h-1 flex-1 rounded-full bg-muted">
                <div
                  className="h-1 rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.round((task.checklistProgress.done / task.checklistProgress.total) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-section text-foreground-secondary">
                {task.checklistProgress.done}/{task.checklistProgress.total}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {task.endDate && (
                <span
                  className={cn(
                    'flex items-center gap-0.5 text-2xs',
                    isOverdue ? 'font-medium text-error' : 'text-foreground-secondary',
                  )}
                >
                  {isOverdue && <AlertTriangle className="h-3 w-3" />}
                  <Calendar className="h-3 w-3" />
                  {new Date(task.endDate).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>
            {task.assigneeName && (
              <span className="flex items-center gap-1 text-2xs text-foreground-secondary">
                <User className="h-3 w-3" />
                {task.assigneeName.split(' ')[0]}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

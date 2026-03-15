'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskStatus } from '@oneohm-epc/shared/types';
import React from 'react';

import { KanbanTaskCard } from './kanban-task-card';
import type { BoardColumn } from '../../hooks/use-kanban-board';

import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  [TaskStatus.BACKLOG]: 'border-t-gray-400',
  [TaskStatus.TODO]: 'border-t-slate-500',
  [TaskStatus.IN_PROGRESS]: 'border-t-blue-500',
  [TaskStatus.IN_REVIEW]: 'border-t-amber-500',
  [TaskStatus.TESTING]: 'border-t-cyan-500',
  [TaskStatus.BLOCKED]: 'border-t-red-500',
  [TaskStatus.DONE]: 'border-t-green-500',
};

const STATUS_LABELS: Record<string, string> = {
  [TaskStatus.BACKLOG]: 'Backlog',
  [TaskStatus.TODO]: 'To Do',
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.IN_REVIEW]: 'In Review',
  [TaskStatus.TESTING]: 'Testing',
  [TaskStatus.BLOCKED]: 'Blocked',
  [TaskStatus.DONE]: 'Done',
};

interface KanbanColumnProps {
  column: BoardColumn;
  onTaskClick?: (taskId: string) => void;
  isInvalidDrop?: boolean;
}

export function KanbanColumn({ column, onTaskClick, isInvalidDrop }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.status,
    data: { type: 'column', status: column.status },
  });

  const taskIds = column.tasks.map((t) => t.id);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-full min-w-[280px] flex-col rounded-lg border border-border border-t-4 bg-muted/30',
        STATUS_COLORS[column.status] ?? 'border-t-gray-400',
        isOver && !isInvalidDrop && 'ring-2 ring-primary/40 bg-primary/5',
        isOver && isInvalidDrop && 'ring-2 ring-error/40 bg-error/5',
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {STATUS_LABELS[column.status] ?? column.status}
          </h3>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-foreground-secondary">
            {column.total}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <KanbanTaskCard key={task.id} task={task} onTaskClick={onTaskClick} />
          ))}
        </SortableContext>

        {column.tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-border/50 py-8 text-center">
            <p className="text-xs text-foreground-secondary">No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}

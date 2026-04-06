'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import React from 'react';

import { KanbanTaskCard } from './kanban-task-card';
import type { BoardColumn } from '../../hooks/use-kanban-board';

import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  column: BoardColumn;
  onTaskClick?: (taskId: string) => void;
  isInvalidDrop?: boolean;
}

export function KanbanColumn({
  column,
  onTaskClick,
  isInvalidDrop,
}: KanbanColumnProps): React.JSX.Element {
  const { setNodeRef, isOver } = useDroppable({
    id: column.status,
    data: { type: 'column', status: column.status },
  });

  const taskIds = column.tasks.map((t) => t.id);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-full w-[320px] flex-shrink-0 flex-col rounded-lg border border-border border-t-4 bg-muted/30',
        isOver && !isInvalidDrop && 'ring-2 ring-primary/40 bg-primary/5',
        isOver && isInvalidDrop && 'ring-2 ring-error/40 bg-error/5',
      )}
      style={{ borderTopColor: column.color }}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{column.label}</h3>
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

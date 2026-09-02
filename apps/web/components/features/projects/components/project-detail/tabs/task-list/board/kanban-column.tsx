'use client';

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { Box } from '@mui/material';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { KanbanCardSkeleton } from './kanban-card-skeleton';
import { KanbanColumnHeader } from './kanban-column-header';
import { KanbanEmptyColumn } from './kanban-empty-column';
import { KanbanTaskCard } from './kanban-task-card';
import type { KanbanColumnData } from '../../../../../hooks/use-project-task-board';

interface KanbanColumnProps {
  column: KanbanColumnData;
  allColumns: KanbanColumnData[];
  isLoading: boolean;
  draggingTaskId: string | null;
  onOpenTask: (taskId: string) => void;
  onMoveToStatus: (taskId: string, newStatus: string, currentCompletionPct: number) => void;
  onAddTask: (status: string) => void;
}

export function KanbanColumn({
  column,
  allColumns,
  isLoading,
  draggingTaskId,
  onOpenTask,
  onMoveToStatus,
  onAddTask,
}: KanbanColumnProps): React.JSX.Element {
  const columnRef = useRef<HTMLDivElement>(null);
  const [isOver, setIsOver] = useState(false);

  // Keep a stable ref so we can read current column.code inside the effect
  // without re-registering the drop target on every render.
  const columnCodeRef = useRef(column.code);
  columnCodeRef.current = column.code;

  // Register as a drop target for task cards
  useEffect(() => {
    const element = columnRef.current;
    if (!element) return;

    return dropTargetForElements({
      element,
      getData() {
        return { type: 'column', toStatus: columnCodeRef.current };
      },
      canDrop({ source }) {
        return source.data.type === 'task' && source.data.fromStatus !== columnCodeRef.current;
      },
      onDragEnter() {
        setIsOver(true);
      },
      onDragLeave() {
        setIsOver(false);
      },
      onDrop() {
        setIsOver(false);
      },
    });
  }, []); // registered once per mount; column.code is read from ref inside

  const handleAddTask = useCallback(() => {
    onAddTask(column.code);
  }, [onAddTask, column.code]);

  return (
    /*
     * The column is a SUNKEN well, not a bordered box: cards float above it on
     * `e1`, which is the DS way of saying "these sit inside that". The old
     * treatment used a 1px outline plus a 3px coloured top rule — two
     * structural lines the design system does not have. The status colour now
     * lives on the header dot instead.
     */
    <Box
      ref={columnRef}
      role="region"
      aria-label={`${column.label} column, ${column.tasks.length} tasks`}
      sx={{
        width: 288,
        minWidth: 288,
        maxWidth: 288,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-r-md)',
        bgcolor: isOver ? 'var(--ds-accent-subtle)' : 'var(--ds-canvas-sunken)',
        boxShadow: isOver ? 'inset 0 0 0 2px var(--ds-primary)' : 'none',
        transition:
          'background-color 150ms var(--ease-standard), box-shadow 150ms var(--ease-standard)',
        overflow: 'hidden',
        flexShrink: 0,
        maxHeight: 'calc(100vh - 300px)',
        minHeight: 140,
      }}
    >
      {/* Sticky header */}
      <KanbanColumnHeader
        label={column.label}
        color={column.color}
        count={column.tasks.length}
        isOver={isOver}
        onAddTask={handleAddTask}
      />

      {/* Card list body */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          px: 1.25,
          pb: 1.5,
          minHeight: 80,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'var(--ds-neutral-300)',
            borderRadius: 999,
          },
        }}
      >
        {isLoading ? (
          <KanbanCardSkeleton count={3} />
        ) : column.tasks.length === 0 ? (
          <KanbanEmptyColumn label={column.label} isOver={isOver} onAddTask={handleAddTask} />
        ) : (
          column.tasks.map((task) => (
            <KanbanTaskCard
              key={task.id}
              taskId={task.id}
              code={task.code}
              name={task.name}
              status={task.status}
              priority={task.priority}
              assigneeName={task.assigneeName}
              endDate={task.endDate}
              completionPercentage={task.completionPercentage}
              labels={task.labels ?? []}
              blockedReason={task.blockedReason}
              isSpecial={task.isSpecial}
              allColumns={allColumns}
              onOpenTask={onOpenTask}
              onMoveToStatus={onMoveToStatus}
              isDraggingThis={draggingTaskId === task.id}
              hasDependencyBlockers={task.hasDependencyBlockers}
            />
          ))
        )}
      </Box>
    </Box>
  );
}

KanbanColumn.displayName = 'KanbanColumn';

'use client';

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { Box, Paper } from '@mui/material';
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
    <Paper
      elevation={0}
      ref={columnRef}
      role="region"
      aria-label={`${column.label} column, ${column.tasks.length} tasks`}
      sx={{
        width: 280,
        minWidth: 280,
        maxWidth: 280,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        border: '1px solid',
        borderColor: isOver ? 'primary.main' : 'divider',
        borderTop: `3px solid ${column.color}`,
        bgcolor: isOver ? 'rgba(0,82,204,0.03)' : 'background.default',
        outline: isOver ? '2px dashed' : 'none',
        outlineColor: 'primary.light',
        outlineOffset: -2,
        transition: 'border-color 0.15s ease, background-color 0.15s ease, outline 0.15s ease',
        overflow: 'hidden',
        flexShrink: 0,
        maxHeight: 'calc(100vh - 280px)',
        minHeight: 120,
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
          p: 1,
          minHeight: 80,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 },
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
              allColumns={allColumns}
              onOpenTask={onOpenTask}
              onMoveToStatus={onMoveToStatus}
              isDraggingThis={draggingTaskId === task.id}
            />
          ))
        )}
      </Box>
    </Paper>
  );
}

KanbanColumn.displayName = 'KanbanColumn';

'use client';

import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { TASK_STATUS_TRANSITIONS, TaskStatus } from '@oneohm-epc/shared/types';
import React, { useCallback, useMemo, useState } from 'react';

import { KanbanColumn } from './kanban-column';
import { KanbanTaskCard } from './kanban-task-card';
import type {
  BoardColumnTask,
  BoardResponse,
  MoveTaskPayload,
  KanbanFilterState,
} from '../../hooks/use-kanban-board';

import { showToast } from '@/components/ui/sonner';

interface KanbanBoardProps {
  data: BoardResponse;
  projectId: string;
  onMoveTask: (payload: MoveTaskPayload) => void;
  onTaskClick?: (taskId: string) => void;
  filters: KanbanFilterState;
  currentUserId?: string;
}

export function KanbanBoard({
  data,
  projectId,
  onMoveTask,
  onTaskClick,
  filters,
  currentUserId,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<BoardColumnTask | null>(null);
  const [overColumnStatus, setOverColumnStatus] = useState<TaskStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  const filteredColumns = useMemo(() => {
    return data.columns.map((col) => {
      let tasks = col.tasks;
      if (filters.assigneeId) {
        tasks = tasks.filter((t) => t.assigneeId === filters.assigneeId);
      }
      if (filters.priority) {
        tasks = tasks.filter((t) => t.priority === filters.priority);
      }
      if (filters.milestoneId) {
        tasks = tasks.filter((t) => t.milestoneName != null);
      }
      if (filters.label) {
        tasks = tasks.filter((t) => t.labels?.includes(filters.label));
      }
      if (filters.myTasks === 'true' && currentUserId) {
        tasks = tasks.filter((t) => t.assigneeId === currentUserId);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        tasks = tasks.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.code.toLowerCase().includes(q) ||
            t.assigneeName?.toLowerCase().includes(q),
        );
      }
      return { ...col, tasks, total: tasks.length };
    });
  }, [data.columns, filters, currentUserId]);

  const isInvalidTransition = useCallback(
    (sourceStatus: TaskStatus | undefined, targetStatus: TaskStatus): boolean => {
      if (!sourceStatus || sourceStatus === targetStatus) return false;
      const allowed = TASK_STATUS_TRANSITIONS[sourceStatus] ?? [];
      return !allowed.includes(targetStatus);
    },
    [],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = event.active.data.current?.task as BoardColumnTask | undefined;
    if (task) setActiveTask(task);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overData = event.over?.data.current;
    if (overData?.type === 'column') {
      setOverColumnStatus(overData.status as TaskStatus);
    } else if (overData?.type === 'task') {
      const overTask = overData.task as BoardColumnTask;
      setOverColumnStatus(overTask.status);
    } else {
      setOverColumnStatus(null);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);
      setOverColumnStatus(null);

      if (!over) return;

      const draggedTask = active.data.current?.task as BoardColumnTask | undefined;
      if (!draggedTask) return;

      let targetStatus: TaskStatus;
      const overData = over.data.current;

      if (overData?.type === 'column') {
        targetStatus = overData.status as TaskStatus;
      } else if (overData?.type === 'task') {
        targetStatus = (overData.task as BoardColumnTask).status;
      } else {
        targetStatus = over.id as TaskStatus;
      }

      if (
        draggedTask.status !== targetStatus &&
        isInvalidTransition(draggedTask.status, targetStatus)
      ) {
        showToast.error(`Cannot move task from ${draggedTask.status} to ${targetStatus}`);
        return;
      }

      const targetCol = filteredColumns.find((c) => c.status === targetStatus);
      const tasksInTarget = targetCol?.tasks ?? [];
      let kanbanOrder: number;

      if (overData?.type === 'task') {
        const overTask = overData.task as BoardColumnTask;
        const overIdx = tasksInTarget.findIndex((t) => t.id === overTask.id);
        kanbanOrder = overIdx >= 0 ? overTask.kanbanOrder : (tasksInTarget.length + 1) * 1000;
      } else {
        kanbanOrder =
          tasksInTarget.length > 0
            ? (tasksInTarget[tasksInTarget.length - 1]?.kanbanOrder ?? 0) + 1000
            : 1000;
      }

      onMoveTask({
        taskId: draggedTask.id,
        projectId,
        status: targetStatus,
        kanbanOrder,
        version: draggedTask.version,
      });
    },
    [filteredColumns, isInvalidTransition, onMoveTask, projectId],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '400px' }}>
        {filteredColumns.map((column) => (
          <KanbanColumn
            key={column.status}
            column={column}
            onTaskClick={onTaskClick}
            isInvalidDrop={
              !!activeTask &&
              overColumnStatus === column.status &&
              isInvalidTransition(activeTask.status, column.status)
            }
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="w-[280px]">
            <KanbanTaskCard task={activeTask} isDragOverlay />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

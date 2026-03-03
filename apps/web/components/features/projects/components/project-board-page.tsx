'use client';

import { ProjectStatus } from '@oneohm-epc/shared-types';
import { AlertCircle, LayoutGrid } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  useKanbanBoard,
  useMoveTask,
  type BoardColumnTask,
  type KanbanFilterState,
} from '../hooks/use-kanban-board';
import { useProjects } from '../hooks/use-projects';
import { KanbanBoard } from './kanban/kanban-board';
import { KanbanFilters } from './kanban/kanban-filters';
import { TaskDrawer } from '../../tasks/components/task-drawer';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/sonner';
import { useUrlFilters } from '@/lib/hooks/use-url-filters';
import { useAuth } from '@/providers/auth-provider';

const FILTER_DEFAULTS: Record<string, string> = {
  project: '',
  task: '',
  assigneeId: '',
  priority: '',
  milestoneId: '',
  label: '',
  myTasks: '',
  search: '',
};

function findTaskByCode(
  columns: Array<{ tasks: BoardColumnTask[] }>,
  code: string,
): BoardColumnTask | undefined {
  const upper = code.toUpperCase();
  for (const col of columns) {
    const found = col.tasks.find((t) => t.code.toUpperCase() === upper);
    if (found) return found;
  }
  return undefined;
}

function findTaskCodeById(
  columns: Array<{ tasks: BoardColumnTask[] }>,
  taskId: string,
): string | undefined {
  for (const col of columns) {
    const found = col.tasks.find((t) => t.id === taskId);
    if (found) return found.code;
  }
  return undefined;
}

export function ProjectBoardPage(): React.JSX.Element {
  const { user } = useAuth();
  const { filters, setFilter } = useUrlFilters(FILTER_DEFAULTS);
  const selectedProjectId = filters.project ?? '';
  const taskCodeFromUrl = filters.task ?? '';
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const deepLinkResolvedRef = useRef(false);
  const prevProjectIdRef = useRef(selectedProjectId);

  const handleTaskClick = useCallback(
    (taskId: string, taskCode?: string) => {
      setSelectedTaskId(taskId);
      if (taskCode) {
        setFilter('task', taskCode);
      }
    },
    [setFilter],
  );

  const handleDrawerClose = useCallback(() => {
    setSelectedTaskId(null);
    setFilter('task', '');
  }, [setFilter]);

  // Clear task param when project changes
  useEffect(() => {
    if (prevProjectIdRef.current && prevProjectIdRef.current !== selectedProjectId) {
      setSelectedTaskId(null);
      setFilter('task', '');
      deepLinkResolvedRef.current = false;
    }
    prevProjectIdRef.current = selectedProjectId;
  }, [selectedProjectId, setFilter]);

  const { data: projectsData } = useProjects({ limit: 100 });
  const projects = useMemo(
    () =>
      (projectsData?.data ?? []).filter(
        (p) => p.status !== ProjectStatus.COMPLETED && p.status !== ProjectStatus.CANCELLED,
      ),
    [projectsData],
  );

  const {
    data: boardData,
    isLoading: boardLoading,
    isError: boardError,
    refetch: refetchBoard,
  } = useKanbanBoard(selectedProjectId || '');

  const moveTask = useMoveTask(selectedProjectId || '');

  // Deep-link resolution: when board data loads and URL has a task code, resolve it
  useEffect(() => {
    if (!boardData || !taskCodeFromUrl || deepLinkResolvedRef.current) return;
    deepLinkResolvedRef.current = true;

    const task = findTaskByCode(boardData.columns, taskCodeFromUrl);
    if (task) {
      setSelectedTaskId(task.id);
    } else {
      showToast.error(`Task "${taskCodeFromUrl}" not found in this project`);
      setFilter('task', '');
    }
  }, [boardData, taskCodeFromUrl, setFilter]);

  // Sync URL → state on browser back/forward (popstate already updates filters)
  useEffect(() => {
    if (!boardData || !taskCodeFromUrl) {
      if (!taskCodeFromUrl && selectedTaskId) {
        setSelectedTaskId(null);
      }
      return;
    }
    if (deepLinkResolvedRef.current) {
      const task = findTaskByCode(boardData.columns, taskCodeFromUrl);
      if (task && task.id !== selectedTaskId) {
        setSelectedTaskId(task.id);
      }
    }
  }, [taskCodeFromUrl, boardData, selectedTaskId]);

  const kanbanFilters: KanbanFilterState = useMemo(
    () => ({
      assigneeId: filters.assigneeId ?? '',
      priority: filters.priority ?? '',
      milestoneId: filters.milestoneId ?? '',
      label: filters.label ?? '',
      myTasks: filters.myTasks ?? '',
      search: filters.search ?? '',
    }),
    [filters],
  );

  const handleSetKanbanFilter = useCallback(
    (key: keyof KanbanFilterState, value: string) => {
      setFilter(key, value);
    },
    [setFilter],
  );

  const handleClearFilters = useCallback(() => {
    setFilter({
      assigneeId: '',
      priority: '',
      milestoneId: '',
      label: '',
      myTasks: '',
      search: '',
    });
  }, [setFilter]);

  // Wrap onTaskClick to also update URL with task code
  const handleBoardTaskClick = useCallback(
    (taskId: string) => {
      if (!boardData) {
        handleTaskClick(taskId);
        return;
      }
      const code = findTaskCodeById(boardData.columns, taskId);
      handleTaskClick(taskId, code);
    },
    [boardData, handleTaskClick],
  );

  if (!selectedProjectId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <LayoutGrid className="mb-4 h-12 w-12 text-foreground-secondary/40" />
        <h2 className="text-lg font-semibold text-foreground">Select a project</h2>
        <p className="mt-1 max-w-sm text-sm text-foreground-secondary">
          Choose a project to view its Kanban board
        </p>
        <div className="mt-6 w-[300px]">
          <Select onValueChange={(v) => setFilter('project', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose project..." />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.projectNumber} - {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <Select value={selectedProjectId} onValueChange={(v) => setFilter('project', v)}>
          <SelectTrigger className="h-8 w-[240px] text-xs">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.projectNumber} - {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="h-5 w-px bg-border-light" />

        {boardData && (
          <KanbanFilters
            filters={kanbanFilters}
            setFilter={handleSetKanbanFilter}
            clearFilters={handleClearFilters}
            boardFilters={boardData.filters}
          />
        )}
      </div>

      {boardLoading && <BoardSkeleton />}

      {boardError && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <p className="text-sm text-foreground-secondary">Failed to load board data</p>
          <Button variant="outline" size="sm" onClick={() => void refetchBoard()}>
            Retry
          </Button>
        </div>
      )}

      {boardData && !boardLoading && (
        <KanbanBoard
          data={boardData}
          projectId={selectedProjectId}
          onMoveTask={(payload) => moveTask.mutate(payload)}
          onTaskClick={handleBoardTaskClick}
          filters={kanbanFilters}
          currentUserId={user?.id}
        />
      )}

      <TaskDrawer
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={handleDrawerClose}
        onTaskUpdated={() => void refetchBoard()}
      />
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex min-w-[280px] flex-col gap-2 rounded-lg border p-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-28 w-full rounded-md" />
          <Skeleton className="h-28 w-full rounded-md" />
          <Skeleton className="h-28 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

'use client';

import { TaskStatus, type MyTask } from '@tejas96/shared/types';
import { Search, X } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import { SectionHeading } from './task-drawer-main-content';
import { useProjectTasks } from '../../projects/hooks';

import { cn } from '@/lib/utils';

const STATUS_INDICATOR: Record<string, { color: string; label: string }> = {
  [TaskStatus.DONE]: { color: 'text-success', label: 'Done' },
  [TaskStatus.CANCELLED]: { color: 'text-foreground-muted', label: 'Cancelled' },
  [TaskStatus.IN_PROGRESS]: { color: 'text-info', label: 'In progress' },
  [TaskStatus.TODO]: { color: 'text-foreground-secondary', label: 'To do' },
  [TaskStatus.BLOCKED]: { color: 'text-error', label: 'Blocked' },
  [TaskStatus.IN_REVIEW]: { color: 'text-warning', label: 'In review' },
  [TaskStatus.TESTING]: { color: 'text-info', label: 'Testing' },
  [TaskStatus.BACKLOG]: { color: 'text-foreground-muted', label: 'Backlog' },
};

interface TaskDrawerDependenciesProps {
  task: MyTask;
  onDependenciesChange: (taskIds: string[]) => void;
}

/** Shared shell for one dependency row — no borders, tinted surface, hover reveal. */
function DependencyRow({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove?: () => void;
}): React.JSX.Element {
  return (
    <div className="group flex items-center justify-between gap-2 rounded-lg bg-background-tertiary px-2.5 py-1.5">
      <div className="flex min-w-0 items-center gap-2">{children}</div>
      {onRemove && (
        <button
          type="button"
          aria-label="Remove dependency"
          onClick={onRemove}
          className="shrink-0 rounded p-0.5 text-foreground-muted opacity-0 transition-opacity transition-colors hover:text-error focus-visible:opacity-100 group-hover:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export function TaskDrawerDependencies({
  task,
  onDependenciesChange,
}: TaskDrawerDependenciesProps): React.JSX.Element {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: projectTasks } = useProjectTasks(task.projectId, {
    enabled: searchOpen,
  });

  const currentDepIds = useMemo(
    () => new Set(task.dependsOnTaskIds ?? []),
    [task.dependsOnTaskIds],
  );

  const filteredTasks = useMemo(() => {
    if (!projectTasks) return [];
    return projectTasks.filter((t) => {
      if (t.id === task.id) return false;
      if (currentDepIds.has(t.id)) return false;
      if (!searchTerm) return true;
      const lower = searchTerm.toLowerCase();
      return t.name?.toLowerCase().includes(lower) || t.code.toLowerCase().includes(lower);
    });
  }, [projectTasks, task.id, currentDepIds, searchTerm]);

  const handleAdd = useCallback(
    (depId: string) => {
      const newDeps = [...(task.dependsOnTaskIds ?? []), depId];
      onDependenciesChange(newDeps);
      setSearchTerm('');
    },
    [task.dependsOnTaskIds, onDependenciesChange],
  );

  const handleRemove = useCallback(
    (depId: string) => {
      const newDeps = (task.dependsOnTaskIds ?? []).filter((id) => id !== depId);
      onDependenciesChange(newDeps);
    },
    [task.dependsOnTaskIds, onDependenciesChange],
  );

  return (
    <div>
      <SectionHeading
        action={
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className="rounded-full px-2 py-1 text-2xs font-medium text-foreground-secondary transition-colors hover:bg-background-tertiary hover:text-foreground"
          >
            {searchOpen ? 'Close' : 'Link a task'}
          </button>
        }
      >
        Dependencies
      </SectionHeading>

      <div className="space-y-2">
        {currentDepIds.size > 0 && (
          <div className="space-y-1">
            {task.dependencyNames?.map((name, i) => {
              const depId = (task.dependsOnTaskIds ?? [])[i];
              const depCode = task.dependencyCodes?.[i];
              return (
                <DependencyRow
                  key={depId ?? i}
                  onRemove={depId ? () => handleRemove(depId) : undefined}
                >
                  {depCode && (
                    <span className="shrink-0 font-mono text-2xs text-foreground-tertiary">
                      {depCode}
                    </span>
                  )}
                  <span className="truncate text-sm text-foreground-secondary">{name}</span>
                </DependencyRow>
              );
            })}
            {(task.dependsOnTaskIds ?? [])
              .filter((_, i) => !task.dependencyNames?.[i])
              .map((depId) => (
                <DependencyRow key={depId} onRemove={() => handleRemove(depId)}>
                  <span className="truncate font-mono text-2xs text-foreground-muted">
                    {depId.slice(0, 8)}…
                  </span>
                </DependencyRow>
              ))}
          </div>
        )}

        {currentDepIds.size === 0 && !searchOpen && (
          <div className="rounded-xl bg-background-tertiary py-5 text-center">
            <p className="text-xs text-foreground-tertiary">
              Nothing blocks this task. Link one to change that.
            </p>
          </div>
        )}

        {searchOpen && (
          <div className="space-y-1.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-foreground-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tasks in this project"
                aria-label="Search tasks to link as a dependency"
                className="h-8 w-full rounded-lg bg-background-tertiary pl-8 pr-3 text-sm placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>
            <div className="max-h-40 space-y-0.5 overflow-y-auto">
              {filteredTasks.slice(0, 15).map((t) => {
                const statusInfo = STATUS_INDICATOR[t.status];
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleAdd(t.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-background-tertiary"
                  >
                    <span className="shrink-0 font-mono text-2xs text-foreground-tertiary">
                      {t.code}
                    </span>
                    <span className="flex-1 truncate text-sm text-foreground">{t.name}</span>
                    {statusInfo && (
                      <span className={cn('shrink-0 text-2xs', statusInfo.color)}>
                        {statusInfo.label}
                      </span>
                    )}
                  </button>
                );
              })}
              {filteredTasks.length === 0 && (
                <p className="py-3 text-center text-xs text-foreground-muted">No matching tasks</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

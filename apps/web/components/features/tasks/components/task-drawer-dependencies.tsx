'use client';

import { TaskStatus, type MyTask } from '@tejas96/shared/types';
import { Link2, Lock, Search, X } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import { useProjectTasks } from '../../projects/hooks';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TaskDrawerDependenciesProps {
  task: MyTask;
  onDependenciesChange: (taskIds: string[]) => void;
}

const STATUS_INDICATOR: Record<string, { color: string; label: string }> = {
  [TaskStatus.DONE]: { color: 'text-success', label: 'Done' },
  [TaskStatus.CANCELLED]: { color: 'text-foreground-muted', label: 'Cancelled' },
  [TaskStatus.IN_PROGRESS]: { color: 'text-info', label: 'In Progress' },
  [TaskStatus.TODO]: { color: 'text-foreground-secondary', label: 'To Do' },
  [TaskStatus.BLOCKED]: { color: 'text-error', label: 'Blocked' },
  [TaskStatus.IN_REVIEW]: { color: 'text-warning', label: 'In Review' },
  [TaskStatus.TESTING]: { color: 'text-info', label: 'Testing' },
  [TaskStatus.BACKLOG]: { color: 'text-foreground-muted', label: 'Backlog' },
};

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

  const hasDependencyBlockers = task.hasDependencyBlockers;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Link2 className="h-4 w-4 text-foreground-tertiary" />
          <p className="text-2xs text-foreground-tertiary">Dependencies</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={() => setSearchOpen(!searchOpen)}
        >
          {searchOpen ? 'Close' : 'Add'}
        </Button>
      </div>

      {hasDependencyBlockers && (
        <div className="flex items-center gap-1.5 rounded bg-error/5 border border-error/20 px-2 py-1">
          <Lock className="h-3 w-3 text-error" />
          <span className="text-xs text-error">Blocked by incomplete dependencies</span>
        </div>
      )}

      {currentDepIds.size > 0 && (
        <div className="space-y-1">
          {task.dependencyNames?.map((name, i) => {
            const depId = (task.dependsOnTaskIds ?? [])[i];
            const depCode = task.dependencyCodes?.[i];
            return (
              <div
                key={depId ?? i}
                className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1.5"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {depCode && (
                    <span className="shrink-0 text-xs font-medium text-foreground-tertiary">
                      {depCode}
                    </span>
                  )}
                  <span className="text-sm text-foreground-secondary truncate">{name}</span>
                </div>
                {depId && (
                  <button
                    type="button"
                    onClick={() => handleRemove(depId)}
                    className="shrink-0 text-foreground-muted hover:text-red-500 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
          {(task.dependsOnTaskIds ?? [])
            .filter((_, i) => !task.dependencyNames?.[i])
            .map((depId) => (
              <div
                key={depId}
                className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1.5"
              >
                <span className="text-sm text-foreground-muted italic truncate">
                  {depId.slice(0, 8)}...
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(depId)}
                  className="shrink-0 text-foreground-muted hover:text-red-500 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
        </div>
      )}

      {currentDepIds.size === 0 && !searchOpen && (
        <p className="text-sm text-foreground-muted italic">No dependencies</p>
      )}

      {searchOpen && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks..."
              className="w-full rounded-md bg-background py-1.5 pl-7 pr-3 text-sm placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-primary shadow-e1"
              autoFocus
            />
          </div>
          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {filteredTasks.slice(0, 15).map((t) => {
              const statusInfo = STATUS_INDICATOR[t.status];
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleAdd(t.id)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted/60 transition-colors"
                >
                  <span className="shrink-0 text-xs font-medium text-foreground-secondary">
                    {t.code}
                  </span>
                  <span className="flex-1 truncate text-foreground">{t.name}</span>
                  {statusInfo && (
                    <span className={cn('shrink-0 text-section', statusInfo.color)}>
                      {statusInfo.label}
                    </span>
                  )}
                </button>
              );
            })}
            {filteredTasks.length === 0 && (
              <p className="py-2 text-center text-xs text-foreground-muted">No matching tasks</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

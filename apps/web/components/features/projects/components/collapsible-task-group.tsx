'use client';

import type { TaskStatus } from '@oneohm-epc/shared-types';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import {
  TASK_GROUP_VARIANT_MAP,
} from '../constants';
import type { MyTask } from '../hooks';
import { TaskRow } from './task-row';

import { cn } from '@/lib/utils';

const INITIAL_VISIBLE_COUNT = 5;

const DEFAULT_GROUP_VARIANT = {
  dot: 'bg-foreground-tertiary',
  border: 'border-border-light',
  leftBorder: 'border-l-border',
  badge: 'secondary',
};

interface CollapsibleTaskGroupProps {
  groupKey: string;
  label: string;
  count: number;
  tasks: MyTask[];
  expanded: boolean;
  onToggleExpand: () => void;
  onOpenDrawer: (task: MyTask) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onMarkDone: (taskId: string) => void;
  onStartTask: (taskId: string) => void;
  focusedTaskId?: string;
}

export function CollapsibleTaskGroup({
  groupKey,
  label,
  count,
  tasks,
  expanded,
  onToggleExpand,
  onOpenDrawer,
  onStatusChange,
  onMarkDone,
  onStartTask,
  focusedTaskId,
}: CollapsibleTaskGroupProps): React.JSX.Element {
  const [showAll, setShowAll] = useState(false);
  const variant = TASK_GROUP_VARIANT_MAP[groupKey] ?? DEFAULT_GROUP_VARIANT;
  const visibleTasks = showAll ? tasks : tasks.slice(0, INITIAL_VISIBLE_COUNT);
  const hiddenCount = tasks.length - INITIAL_VISIBLE_COUNT;

  const badgeColorClass = (() => {
    switch (variant.badge) {
      case 'error': return 'bg-error/10 text-error';
      case 'warning': return 'bg-warning/10 text-warning';
      case 'info': return 'bg-info/10 text-info';
      case 'success': return 'bg-success/10 text-success';
      default: return 'bg-muted text-foreground-tertiary';
    }
  })();

  return (
    <div>
      {/* Collapsible header */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex items-center gap-2 w-full text-left py-1.5 group/header"
      >
        {expanded ? (
          <ChevronDown className="size-3.5 text-foreground-tertiary transition-transform" />
        ) : (
          <ChevronRight className="size-3.5 text-foreground-tertiary transition-transform" />
        )}
        <span className={cn('size-2 rounded-full shrink-0', variant.dot)} />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground-secondary">{label}</h2>
        <span
          className={cn(
            'text-2xs px-1.5 py-0.5 rounded-full font-medium',
            badgeColorClass,
          )}
        >
          {count}
        </span>
      </button>

      {/* Collapsible content */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          expanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div
          className={cn(
            'bg-background rounded-lg border border-l-[3px] overflow-hidden',
            variant.border,
            variant.leftBorder,
          )}
        >
          {visibleTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onOpenDrawer={onOpenDrawer}
              onStatusChange={onStatusChange}
              onMarkDone={onMarkDone}
              onStartTask={onStartTask}
              isFocused={focusedTaskId === task.id}
            />
          ))}

          {hiddenCount > 0 && (
            <div className="text-center py-2.5 border-t border-border-light">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAll((prev) => !prev);
                }}
                className="text-xs text-foreground-tertiary hover:text-foreground-secondary transition-colors"
              >
                {showAll
                  ? 'Show less'
                  : `Show ${hiddenCount} more\u2026`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import type { TaskChecklist } from '@tejas96/shared/types';
import { Check } from 'lucide-react';
import { useCallback } from 'react';

interface TaskDrawerChecklistProps {
  checklist?: TaskChecklist;
  onToggleItem?: (updatedChecklist: TaskChecklist) => void;
}

export function TaskDrawerChecklist({
  checklist,
  onToggleItem,
}: TaskDrawerChecklistProps): React.JSX.Element {
  const handleToggle = useCallback(
    (itemId: string) => {
      if (!checklist || !onToggleItem) return;
      const updatedItems = checklist.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              isCompleted: !item.isCompleted,
              completedAt: !item.isCompleted ? new Date().toISOString() : undefined,
            }
          : item,
      );
      onToggleItem({ items: updatedItems });
    },
    [checklist, onToggleItem],
  );

  if (!checklist?.items?.length) {
    return (
      <div className="rounded-xl bg-background-tertiary py-6 text-center">
        <p className="text-xs text-foreground-tertiary">No checklist on this task</p>
      </div>
    );
  }

  const doneCount = checklist.items.filter((i) => i.isCompleted).length;
  const pct = Math.round((doneCount / checklist.items.length) * 100);

  return (
    <div className="space-y-2">
      {/* Count and progress */}
      <div className="flex items-center gap-3">
        <p className="shrink-0 font-mono text-2xs text-foreground-secondary">
          {doneCount}/{checklist.items.length}
        </p>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-background-tertiary">
          <div
            className="h-full rounded-full bg-success transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ul className="space-y-0.5">
        {checklist.items
          .sort((a, b) => a.order - b.order)
          .map((item) => (
            <li
              key={item.id}
              className="group flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-background-tertiary"
              onClick={() => handleToggle(item.id)}
              role="checkbox"
              aria-checked={item.isCompleted}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggle(item.id);
                }
              }}
            >
              <span
                aria-hidden="true"
                className={`mt-px flex size-4 shrink-0 items-center justify-center rounded-[5px] transition-colors ${
                  item.isCompleted
                    ? 'bg-success text-white'
                    : 'bg-background-tertiary text-transparent group-hover:bg-border'
                }`}
              >
                <Check className="size-3" strokeWidth={3} />
              </span>
              <span
                className={`text-sm leading-snug ${
                  item.isCompleted
                    ? 'text-foreground-muted line-through'
                    : 'text-foreground-secondary'
                }`}
              >
                {item.title}
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}

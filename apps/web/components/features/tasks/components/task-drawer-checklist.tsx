'use client';

import type { TaskChecklist } from '@oneohm-epc/shared-types';
import { CheckSquare, Square } from 'lucide-react';
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
      <div className="py-8 text-center">
        <p className="text-sm text-foreground-muted">No checklist items</p>
      </div>
    );
  }

  const doneCount = checklist.items.filter((i) => i.isCompleted).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-foreground-tertiary">
          {doneCount} of {checklist.items.length} completed
        </p>
        <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${checklist.items.length > 0 ? (doneCount / checklist.items.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <ul className="space-y-1">
        {checklist.items
          .sort((a, b) => a.order - b.order)
          .map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-background-secondary transition-colors cursor-pointer"
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
              {item.isCompleted ? (
                <CheckSquare className="size-4 text-success mt-0.5 shrink-0" />
              ) : (
                <Square className="size-4 text-foreground-muted mt-0.5 shrink-0" />
              )}
              <span
                className={`text-sm ${item.isCompleted ? 'line-through text-foreground-muted' : 'text-foreground-secondary'}`}
              >
                {item.title}
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}

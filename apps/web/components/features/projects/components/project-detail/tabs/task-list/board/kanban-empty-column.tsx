'use client';

import { Plus } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

interface KanbanEmptyColumnProps {
  label: string;
  isOver: boolean;
  onAddTask: () => void;
}

/**
 * An empty column.
 *
 * The dashed outline is deliberate and is the one place the design system
 * allows a line: a drop zone has to read as a place where something can land,
 * and a shadow cannot say that about empty space.
 */
export function KanbanEmptyColumn({
  label,
  isOver,
  onAddTask,
}: KanbanEmptyColumnProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'm-1 flex min-h-[120px] flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-3 py-6 text-center transition-colors duration-fast',
        isOver ? 'border-primary bg-accent-subtle' : 'border-border-light',
      )}
    >
      {isOver ? (
        <p className="text-[12.5px] font-semibold text-primary-dark">Drop to move to {label}</p>
      ) : (
        <>
          <p className="text-[12px] text-foreground-tertiary">Nothing in {label}</p>
          <button
            type="button"
            onClick={onAddTask}
            className="inline-flex h-7 items-center gap-1 rounded-pill px-2.5 text-[12px] font-medium text-foreground-secondary transition-colors duration-fast hover:bg-surface hover:text-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Plus className="size-3" strokeWidth={2.25} />
            Add task
          </button>
        </>
      )}
    </div>
  );
}

KanbanEmptyColumn.displayName = 'KanbanEmptyColumn';

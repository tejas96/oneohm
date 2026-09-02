'use client';

import { Plus } from 'lucide-react';
import React from 'react';

import { Mono } from '../../../primitives';

import { cn } from '@/lib/utils';

interface KanbanColumnHeaderProps {
  label: string;
  color: string;
  count: number;
  isOver: boolean;
  onAddTask: () => void;
}

/**
 * The column's name, in the overline device.
 *
 * Sticky, and sitting on the column's own sunken fill rather than a white bar
 * with a rule under it — the DS has no structural lines, so the header
 * separates from the cards by weight and letter-spacing alone.
 */
export function KanbanColumnHeader({
  label,
  color,
  count,
  isOver,
  onAddTask,
}: KanbanColumnHeaderProps): React.JSX.Element {
  return (
    <div className="sticky top-0 z-[1] flex items-center gap-2 px-3.5 pb-2 pt-3.5 backdrop-blur-[2px]">
      <span
        aria-hidden
        className={cn(
          'size-2.5 shrink-0 rounded-full transition-transform duration-fast',
          isOver && 'scale-[1.35]',
        )}
        style={{ background: color }}
      />
      <h3 className="min-w-0 truncate text-[11px] font-bold uppercase tracking-[0.12em] text-foreground-secondary">
        {label}
      </h3>
      <Mono
        className={cn(
          'rounded-pill px-1.5 py-[3px] text-[10px] font-bold leading-none transition-colors duration-fast',
          isOver ? 'bg-primary-dark text-white' : 'bg-surface text-foreground-secondary',
        )}
      >
        {count}
      </Mono>
      <button
        type="button"
        onClick={onAddTask}
        aria-label={`Add a task to ${label}`}
        title={`Add a task to ${label}`}
        className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-full text-foreground-tertiary transition-colors duration-fast hover:bg-surface hover:text-primary-dark focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
      >
        <Plus className="size-3.5" strokeWidth={2.25} />
      </button>
    </div>
  );
}

KanbanColumnHeader.displayName = 'KanbanColumnHeader';

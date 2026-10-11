'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type JSX, type MouseEvent, type ReactNode, useRef } from 'react';

import { cn } from '@/lib/utils';

/** Rows rise in 55ms apart; from the 13th on they arrive together. */
export const STAGGER_MS = 55;
export const MAX_STAGGER_STEPS = 12;
/** How long one row takes to rise; with the stagger, when the entrance is over. */
export const ENTRANCE_RISE_MS = 700;

/** Everything in a cell sits above the row's cover link or button. */
export const ABOVE = 'relative z-[1]';

/** For a link or button inside a row: its click is its own, not the row's. */
export const stopRowClick = (event: MouseEvent): void => event.stopPropagation();

/** How far the pointer may travel between press and release and still be a click. */
const DRAG_SLOP_PX = 4;

/**
 * Tells a click from a drag. Dragging across a name or a number selects it to
 * copy, and the browser still fires `click` when the button comes up — that
 * must not open the row. (Asking "is any text selected?" instead is wrong the
 * other way: a plain click on text selected earlier would then do nothing.)
 *
 * Spread `onMouseDown` on the row; call `wasDrag(event)` in its click handler.
 */
export function useDragGuard(): {
  onMouseDown: (event: MouseEvent) => void;
  wasDrag: (event: MouseEvent) => boolean;
} {
  const pressedAt = useRef<{ x: number; y: number } | null>(null);
  return {
    onMouseDown: (event) => {
      pressedAt.current = { x: event.clientX, y: event.clientY };
    },
    wasDrag: (event) => {
      const start = pressedAt.current;
      pressedAt.current = null;
      // No recorded press (a keyboard or scripted click) is never a drag.
      if (!start) return false;
      return (
        Math.abs(event.clientX - start.x) > DRAG_SLOP_PX ||
        Math.abs(event.clientY - start.y) > DRAG_SLOP_PX
      );
    },
  };
}

const CARD = cn(
  'relative cursor-pointer rounded-rf-xl bg-surface px-5 py-4 shadow-e1',
  'transition-[box-shadow,transform] duration-[250ms] ease-calm hover:-translate-y-0.5 hover:shadow-calm',
  'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
);

export interface CalmRowProps {
  /** The row's CSS grid (its columns at each width). */
  className: string;
  /** What opening the row does, for a screen reader: "Open quote QT-12 for Asha Patil". */
  label: string;
  /** A row that opens a page. Give this or `onOpen`. */
  href?: string;
  /** A row that opens something in place (a panel, a dialog). */
  onOpen?: () => void;
  /** Its position in the list, for the entrance stagger. */
  index: number;
  /** True only while the list makes its first entrance. */
  entering: boolean;
  /** Whatever it opened is open now. */
  selected?: boolean;
  /** Marks the row in the DOM (`data-list-row`), e.g. with its id. */
  rowId: string;
  /**
   * A row that opens in place: what it shows under its cells while `expanded`
   * (a vendor's bills, a project's milestones). Give it with `onOpen`, which
   * then toggles. The card grows; nothing navigates.
   */
  expansion?: ReactNode;
  /** The `expansion` is showing. */
  expanded?: boolean;
  children: ReactNode;
}

/**
 * One record, one card.
 *
 * The card is a plain container, not a `role="button"` or a link wrapped
 * around other links — that hides the links inside from a screen reader.
 * Instead a real link (or button) covers the card, first in tab order, and the
 * cells sit above it (`ABOVE`) as ordinary links and buttons. A click on any
 * plain part of the card does what the cover does.
 */
export function CalmRow({
  className,
  label,
  href,
  onOpen,
  index,
  entering,
  selected = false,
  rowId,
  expansion,
  expanded = false,
  children,
}: CalmRowProps): JSX.Element {
  const router = useRouter();
  const cover = useRef<HTMLButtonElement>(null);
  const drag = useDragGuard();

  // A row that opens in place keeps its cells in their own grid, so what it
  // opens can sit under them at the card's full width.
  const expandable = expansion !== undefined;

  const open = (event: MouseEvent): void => {
    if (drag.wasDrag(event)) return;
    if (href) {
      // Keep the browser's own "open in a new tab" for a modified click.
      if (event.metaKey || event.ctrlKey || event.shiftKey) window.open(href, '_blank');
      else void router.push(href);
      return;
    }
    cover.current?.focus({ preventScroll: true });
    onOpen?.();
  };

  return (
    <div
      data-list-row={rowId}
      onMouseDown={drag.onMouseDown}
      onClick={open}
      style={
        entering
          ? { animationDelay: `${Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS}ms` }
          : undefined
      }
      className={cn(
        CARD,
        !expandable && className,
        entering && 'animate-calm-rise motion-reduce:animate-none',
        selected && 'shadow-calm ring-2 ring-foreground',
      )}
    >
      {href ? (
        <Link
          href={href}
          prefetch={false}
          aria-label={label}
          onClick={stopRowClick}
          className="absolute inset-0 z-0 rounded-rf-xl"
        />
      ) : (
        <button
          ref={cover}
          type="button"
          aria-label={label}
          aria-expanded={expandable ? expanded : undefined}
          onClick={(event) => {
            event.stopPropagation();
            onOpen?.();
          }}
          className="absolute inset-0 z-0 cursor-pointer rounded-rf-xl"
        />
      )}
      {expandable ? (
        <>
          <div className={className}>{children}</div>
          {expanded ? (
            // Its clicks are its own: a link or a drag to copy a figure in
            // here must not close the row.
            <div
              className={cn(ABOVE, 'mt-4 cursor-auto border-t border-border pt-4')}
              onClick={stopRowClick}
            >
              {expansion}
            </div>
          ) : null}
        </>
      ) : (
        children
      )}
    </div>
  );
}

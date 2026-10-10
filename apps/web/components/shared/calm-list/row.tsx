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

/** A small pill after a name: a status, a group, "Loan". */
export const ROW_TAG =
  'truncate rounded-pill px-2 py-0.5 text-[11px] font-medium leading-[13px] text-foreground-secondary';

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
  children,
}: CalmRowProps): JSX.Element {
  const router = useRouter();
  const cover = useRef<HTMLButtonElement>(null);

  const open = (event: MouseEvent): void => {
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
      onClick={open}
      style={
        entering
          ? { animationDelay: `${Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS}ms` }
          : undefined
      }
      className={cn(
        CARD,
        className,
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
          onClick={(event) => {
            event.stopPropagation();
            onOpen?.();
          }}
          className="absolute inset-0 z-0 cursor-pointer rounded-rf-xl"
        />
      )}
      {children}
    </div>
  );
}

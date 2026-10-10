'use client';

import { LinearProgress } from '@mui/material';
import { type JSX, type ReactNode, useEffect, useRef, useState } from 'react';

import { ENTRANCE_RISE_MS, MAX_STAGGER_STEPS, STAGGER_MS } from './row';

import { cn } from '@/lib/utils';

/**
 * The header stays in view while the list scrolls.
 *
 * In a desktop-size window (1024 wide and 700 tall, or more) the whole block
 * pins: title, quick views and search bar. In a smaller window that block
 * would cover most of the screen, so it is `display: contents` there and only
 * the search bar pins. Both pin under the global header, like the detail pages'
 * tab rails. The page colour behind them hides the rows that scroll under, and
 * the side bleed covers the rows' shadows.
 */
const PINNED_HEADER = cn(
  'contents',
  '[@media(min-width:1024px)_and_(min-height:700px)]:sticky',
  '[@media(min-width:1024px)_and_(min-height:700px)]:top-[var(--header-height)]',
  '[@media(min-width:1024px)_and_(min-height:700px)]:z-10',
  '[@media(min-width:1024px)_and_(min-height:700px)]:-mx-7',
  '[@media(min-width:1024px)_and_(min-height:700px)]:-mt-3',
  '[@media(min-width:1024px)_and_(min-height:700px)]:block',
  '[@media(min-width:1024px)_and_(min-height:700px)]:bg-surface-secondary',
  '[@media(min-width:1024px)_and_(min-height:700px)]:px-7',
  '[@media(min-width:1024px)_and_(min-height:700px)]:pt-3',
);
const PINNED_TOOLBAR =
  'sticky top-[var(--header-height)] z-10 -mx-4 mt-2.5 bg-surface-secondary px-4 pb-2.5 pt-2 sm:-mx-7 sm:px-7';

/** A link or button in a row that takes keyboard focus scrolls clear of the pinned header. */
const ROW_FOCUS_CLEARS_PINNED = cn(
  '[--row-scroll-mt:calc(var(--header-height)+var(--list-pinned-h,0px)+12px)]',
  '[&_a]:scroll-mt-[var(--row-scroll-mt)] [&_button]:scroll-mt-[var(--row-scroll-mt)]',
);

/**
 * True only while a list makes its first entrance: rows rise in once, and
 * later changes (a filter, a page) swap in without replaying it.
 */
export function useListEntrance(rowCount: number): boolean {
  const [entered, setEntered] = useState(false);
  const hasRows = rowCount > 0;
  useEffect(() => {
    if (entered || !hasRows) return undefined;
    const timer = setTimeout(
      () => setEntered(true),
      Math.min(rowCount, MAX_STAGGER_STEPS) * STAGGER_MS + ENTRANCE_RISE_MS,
    );
    return () => clearTimeout(timer);
  }, [entered, hasRows, rowCount]);
  return !entered;
}

export interface CalmListPageProps {
  /** The title and anything else that pins above the search bar (a ribbon, quick views). */
  header: ReactNode;
  /** The search / filters / sort bar. It pins on every screen size. */
  toolbar: ReactNode;
  /** Shown between the toolbar and the rows when the list failed to load. */
  error?: ReactNode;
  /** Something that belongs with the rows and scrolls with them (a selection bar). */
  aboveRows?: ReactNode;
  /** A request is in flight. */
  isFetching: boolean;
  /** The first load: there are no rows to keep on screen. */
  isLoading: boolean;
  /** The rows, their skeleton, or the empty state. */
  children: ReactNode;
  /** The pager. */
  footer?: ReactNode;
  /** Panels and dialogs: they sit outside the column. */
  overlays?: ReactNode;
}

/**
 * The frame every calm list page shares: the warm page, a pinned header, the
 * rows in one column, the pager, and room at the right for the filter panel.
 */
export function CalmListPage({
  header,
  toolbar,
  error,
  aboveRows,
  isFetching,
  isLoading,
  children,
  footer,
  overlays,
}: CalmListPageProps): JSX.Element {
  // ── Pinned header: its height is published so a row that takes keyboard
  // focus is scrolled clear of it, never underneath (ROW_FOCUS_CLEARS_PINNED). ──
  const pageRef = useRef<HTMLDivElement>(null);
  const pinnedHeaderRef = useRef<HTMLDivElement>(null);
  const pinnedToolbarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const pageEl = pageRef.current;
    const headerEl = pinnedHeaderRef.current;
    const toolbarEl = pinnedToolbarRef.current;
    if (!pageEl || !headerEl || !toolbarEl) return undefined;
    const publish = (): void => {
      // The whole header is `display: contents` (height 0) when only the bar pins.
      const pinned = headerEl.offsetHeight || toolbarEl.offsetHeight;
      pageEl.style.setProperty('--list-pinned-h', `${pinned}px`);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(headerEl);
    observer.observe(toolbarEl);
    window.addEventListener('resize', publish);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', publish);
    };
  }, []);

  return (
    <div
      ref={pageRef}
      // The filter panel docks at the right. From 1350px the page moves over and
      // keeps its wide rows; narrower, moving over would squeeze the rows into
      // their stacked shape, so the panel lies over the right edge instead.
      className="-m-4 min-h-[calc(100vh-var(--header-height))] bg-surface-secondary text-[14px] leading-[1.45] text-foreground transition-[padding] duration-200 ease-calm motion-reduce:transition-none min-[1350px]:pr-[var(--filters-drawer-w,0px)] lg:-m-5"
    >
      <div className="mx-auto max-w-[1180px] px-4 pb-20 pt-6 sm:px-7 sm:pt-9">
        <div ref={pinnedHeaderRef} className={PINNED_HEADER}>
          {header}

          <div ref={pinnedToolbarRef} className={PINNED_TOOLBAR}>
            {toolbar}
            {/* Background refetch: the rows stay; only this thin bar shows. Always
                mounted so toggling it never moves the list. It rides on the pinned
                bar, so it shows while the list is scrolled too. */}
            <LinearProgress
              aria-hidden={!(isFetching && !isLoading)}
              sx={{
                position: 'absolute',
                insetInline: { xs: 24, sm: 36 },
                bottom: 4,
                height: 2,
                borderRadius: 'var(--radius-pill)',
                opacity: isFetching && !isLoading ? 1 : 0,
                transition: 'opacity 200ms ease',
                '@media (prefers-reduced-motion: reduce)': {
                  transition: 'none',
                  '& .MuiLinearProgress-bar': { animation: 'none' },
                },
              }}
            />
          </div>
        </div>

        {error}

        <div className={cn('@container', ROW_FOCUS_CLEARS_PINNED)} aria-busy={isFetching}>
          {aboveRows}
          {children}
        </div>

        {footer}
      </div>

      {overlays}
    </div>
  );
}

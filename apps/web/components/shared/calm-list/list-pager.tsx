'use client';

import { type ChangeEvent, type JSX, memo } from 'react';

import { ChevronIcon } from './icons';

import { cn, formatNumber } from '@/lib/utils';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const CONTROL = 'h-[34px] rounded-input-functional bg-surface shadow-e1';
const BUTTON = cn(
  CONTROL,
  'grid min-w-[34px] place-items-center px-2.5 tabular-nums',
  'transition-colors duration-200 hover:bg-background-tertiary disabled:cursor-default disabled:opacity-40 disabled:hover:bg-surface',
);

/**
 * Page numbers to show: first, last, and the current page with a neighbour on
 * each side. `null` is a gap.
 */
function pageWindow(page: number, totalPages: number): (number | null)[] {
  const wanted = new Set([0, totalPages - 1, page - 1, page, page + 1]);
  // Near either end, show three in a row rather than "1 … 3".
  if (page <= 1) wanted.add(2);
  if (page >= totalPages - 2) wanted.add(totalPages - 3);
  const pages = [...wanted].filter((p) => p >= 0 && p < totalPages).sort((a, b) => a - b);

  const out: (number | null)[] = [];
  pages.forEach((p, i) => {
    const prev = pages[i - 1];
    // A gap of exactly one page is that page, not an ellipsis.
    if (prev !== undefined && p - prev === 2) out.push(prev + 1);
    else if (prev !== undefined && p - prev > 2) out.push(null);
    out.push(p);
  });
  return out;
}

export interface ListPagerProps {
  /** Zero-based, as `useTableUrlState` keeps it. */
  page: number;
  pageSize: number;
  totalRowCount: number;
  onPageChange: (page: number) => void;
  /** Omit for a list with one fixed page size: the "Rows" picker is left out. */
  onPageSizeChange?: (pageSize: number) => void;
  /** What a row is, for "Showing 1–10 of 1,230 customers". */
  noun: { one: string; many: string };
  /** The list failed to load: there is no count to state. */
  countUnknown?: boolean;
}

/**
 * "Showing 1–10 of 1,230 customers", rows per page, and the pages.
 *
 * The shown page is the controlled prop as-is, never clamped to the page count:
 * while a page change is in flight the total can read 0, and a clamp would snap
 * the pager back to page 1.
 */
function ListPagerInner({
  page,
  pageSize,
  totalRowCount,
  onPageChange,
  onPageSizeChange,
  noun,
  countUnknown = false,
}: ListPagerProps): JSX.Element {
  const totalPages = totalRowCount === 0 ? 1 : Math.ceil(totalRowCount / pageSize);
  const start = totalRowCount === 0 ? 0 : page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, totalRowCount);
  const canPrev = page > 0;
  const canNext = totalRowCount > 0 && page < totalPages - 1;

  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 text-[13px] text-foreground-secondary"
    >
      <span>
        {countUnknown
          ? ''
          : totalRowCount === 0
            ? `No ${noun.many}`
            : `Showing ${formatNumber(start)}–${formatNumber(end)} of ${formatNumber(totalRowCount)} ${
                totalRowCount === 1 ? noun.one : noun.many
              }`}
      </span>

      <div className="flex flex-wrap items-center gap-1.5">
        {onPageSizeChange ? (
          <>
            <label htmlFor="list-page-size">Rows</label>
            <select
              id="list-page-size"
              value={pageSize}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                onPageSizeChange(Number(event.target.value))
              }
              className={cn(CONTROL, 'mr-1.5 cursor-pointer border-0 px-2.5 text-foreground')}
            >
              {(PAGE_SIZE_OPTIONS.includes(pageSize)
                ? PAGE_SIZE_OPTIONS
                : [...PAGE_SIZE_OPTIONS, pageSize].sort((a, b) => a - b)
              ).map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </>
        ) : null}

        <button
          type="button"
          aria-label="Previous page"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
          className={BUTTON}
        >
          <ChevronIcon direction="left" />
        </button>

        {pageWindow(page, totalPages).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} aria-hidden="true" className="px-0.5">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-label={`Page ${p + 1} of ${totalPages}`}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onPageChange(p)}
              className={cn(BUTTON, p === page && 'bg-foreground text-white hover:bg-foreground')}
            >
              {formatNumber(p + 1)}
            </button>
          ),
        )}

        <button
          type="button"
          aria-label="Next page"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          className={BUTTON}
        >
          <ChevronIcon direction="right" />
        </button>
      </div>
    </nav>
  );
}

export const ListPager = memo(ListPagerInner);

'use client';

import { type ReadonlyURLSearchParams, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useRef } from 'react';

import {
  parseTableStateFromParams,
  type TableUrlFilterRecord,
  type TableUrlSortModel,
  type TableUrlState,
  writeTableStateToParams,
} from './use-table-url-state';

export interface UseListUrlOptions {
  /** Prefixes the list's own keys (`cash_page`, `cash_sort`, …). */
  prefix: string;
  defaultPageSize: number;
  /** The sizes the pager offers. Any other size in the URL becomes the default. */
  pageSizeOptions?: readonly number[];
  /** The fields the API sorts on. Any other sort in the URL is dropped. */
  sortFields?: readonly string[];
}

export interface UseListUrlReturn {
  /** The whole query string, for the keys the page owns itself (`?scope=`). */
  params: ReadonlyURLSearchParams;
  state: TableUrlState;
  /** `replace: true` corrects the URL in place instead of adding a Back step. */
  setPage: (page: number, options?: { replace?: boolean }) => void;
  setPageSize: (pageSize: number) => void;
  setSearch: (search: string) => void;
  setSortModel: (model: TableUrlSortModel | null) => void;
  setFilters: (filters: TableUrlFilterRecord) => void;
  /**
   * Change keys the page owns. Return the list state that changes with them
   * (`{ page: 0 }` for a view that starts at its first page), so both land in
   * one URL write and no render sees the new view with the old page.
   */
  edit: (change: (params: URLSearchParams) => Partial<TableUrlState> | void) => void;
}

function sameSort(a: TableUrlSortModel | null, b: TableUrlSortModel | null): boolean {
  return a?.field === b?.field && a?.direction === b?.direction;
}

/**
 * The URL is typed by hand as often as it is clicked: keep only what the page
 * could have written itself.
 */
function readListState(from: URLSearchParams, options: UseListUrlOptions): TableUrlState {
  const { prefix, defaultPageSize, pageSizeOptions, sortFields } = options;
  const parsed = parseTableStateFromParams(from, prefix, defaultPageSize);
  return {
    ...parsed,
    pageSize:
      pageSizeOptions && !pageSizeOptions.includes(parsed.pageSize)
        ? defaultPageSize
        : parsed.pageSize,
    sortModel: cleanSort(parsed.sortModel, sortFields),
  };
}

/** `_sort` is parsed JSON, so it can be anything at all. */
function cleanSort(raw: unknown, fields: readonly string[] | undefined): TableUrlSortModel | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { field, direction } = raw as { field?: unknown; direction?: unknown };
  if (typeof field !== 'string' || (direction !== 'asc' && direction !== 'desc')) return null;
  if (fields && !fields.includes(field)) return null;
  return { field, direction };
}

/**
 * A list's view state read straight from the address bar: page, page size,
 * search, sort and filters, in the same keys `useTableUrlState` writes.
 *
 * `useTableUrlState` keeps a copy in React state and syncs it. That is one
 * render late when another URL key changes with it, and the finance lists
 * have such keys: a Receivables scope or an Approvals status tab that must
 * take the page (and the sort) back to the start. Here nothing is copied —
 * the URL is the only state, so a scope and its page always change together,
 * and Back, a refresh and a link all restore the same view.
 *
 * Written with the History API, which Next keeps `useSearchParams` in step
 * with. A page change adds a Back step; everything else replaces.
 */
export function useListUrl({
  prefix,
  defaultPageSize,
  pageSizeOptions,
  sortFields,
}: UseListUrlOptions): UseListUrlReturn {
  const params = useSearchParams();
  const query = params.toString();
  const state = useMemo(
    () =>
      readListState(new URLSearchParams(query), {
        prefix,
        defaultPageSize,
        pageSizeOptions,
        sortFields,
      }),
    [query, prefix, defaultPageSize, pageSizeOptions, sortFields],
  );

  // Held in a ref so the setters keep one identity for memoised rows.
  const options = useRef({ prefix, defaultPageSize, pageSizeOptions, sortFields });
  options.current = { prefix, defaultPageSize, pageSizeOptions, sortFields };

  const write = useCallback(
    (
      change: (params: URLSearchParams, current: TableUrlState) => Partial<TableUrlState> | void,
      push = false,
    ): void => {
      // From the address bar, not from the last render: two changes in one
      // tick must not undo each other.
      const before = window.location.search.replace(/^\?/, '');
      const next = new URLSearchParams(before);
      const current = readListState(next, options.current);
      const patch = change(next, current);
      writeTableStateToParams(
        next,
        { ...current, ...patch },
        options.current.prefix,
        options.current.defaultPageSize,
      );
      const after = next.toString();
      if (after === new URLSearchParams(before).toString()) return;
      const url = after ? `${window.location.pathname}?${after}` : window.location.pathname;
      if (push) window.history.pushState(null, '', url);
      else window.history.replaceState(null, '', url);
    },
    [],
  );

  const setPage = useCallback(
    (page: number, pageOptions?: { replace?: boolean }): void =>
      write((_, current) => (page === current.page ? undefined : { page }), !pageOptions?.replace),
    [write],
  );
  const setPageSize = useCallback(
    (pageSize: number): void => write(() => ({ pageSize, page: 0 })),
    [write],
  );
  const setSearch = useCallback(
    (search: string): void => write(() => ({ search, page: 0 })),
    [write],
  );
  const setSortModel = useCallback(
    (sortModel: TableUrlSortModel | null): void =>
      write((_, current) =>
        sameSort(current.sortModel, sortModel) ? { page: 0 } : { sortModel, page: 0 },
      ),
    [write],
  );
  const setFilters = useCallback(
    (filters: TableUrlFilterRecord): void => write(() => ({ filters, page: 0 })),
    [write],
  );
  const edit = useCallback(
    (change: (params: URLSearchParams) => Partial<TableUrlState> | void): void =>
      write((next) => change(next)),
    [write],
  );

  return { params, state, setPage, setPageSize, setSearch, setSortModel, setFilters, edit };
}

/** Set `key` to `value`, or drop it when the value is the default (or none). */
export function setUrlChoice(
  params: URLSearchParams,
  key: string,
  value: string | undefined,
  fallback?: string,
): void {
  if (value === undefined || value === fallback) params.delete(key);
  else params.set(key, value);
}

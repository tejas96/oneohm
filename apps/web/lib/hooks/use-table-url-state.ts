'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

/** Inline sort model shape — mirrors TableSortModel without a circular import */
export interface TableUrlSortModel {
  field: string;
  direction: 'asc' | 'desc';
}

/** Inline filter state — mirrors FilterState without a circular import */
export type TableUrlFilterRecord = Record<string, unknown>;

export interface TableUrlState {
  page: number;
  pageSize: number;
  search: string;
  sortModel: TableUrlSortModel | null;
  filters: TableUrlFilterRecord;
}

export interface UseTableUrlStateOptions {
  /** Prefix all param keys to avoid collisions when multiple tables share a page */
  prefix?: string;
  defaultPageSize?: number;
  /** Use pushState for page changes so browser back = previous page */
  pushForPageChanges?: boolean;
}

export interface UseTableUrlStateReturn {
  state: TableUrlState;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSearch: (search: string) => void;
  setSortModel: (model: TableUrlSortModel | null) => void;
  setFilters: (filters: TableUrlFilterRecord) => void;
  resetAll: () => void;
}

// ============================================================================
// Pure serialisation helpers (no side-effects, unit-testable)
// ============================================================================

export function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeInt(raw: string | null, fallback: number, min = 0): number {
  if (raw == null) return fallback;
  const n = parseInt(raw, 10);
  return isNaN(n) || n < min ? fallback : n;
}

function buildKey(prefix: string, name: string): string {
  return prefix ? `${prefix}_${name}` : name;
}

function isSafeObjectKey(key: string): boolean {
  return key !== '__proto__' && key !== 'prototype' && key !== 'constructor';
}

function normalizeFilters(filters: TableUrlFilterRecord): TableUrlFilterRecord {
  const normalized: TableUrlFilterRecord = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (!isSafeObjectKey(key)) return;
    if (value == null || value === '') return;

    if (typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      const cleaned = Object.fromEntries(
        Object.entries(obj).filter(([nestedKey, nestedValue]) => {
          if (!isSafeObjectKey(nestedKey)) return false;
          return nestedValue != null && nestedValue !== '';
        }),
      );
      if (Object.keys(cleaned).length === 0) return;
      normalized[key] = cleaned;
      return;
    }

    normalized[key] = value;
  });

  return normalized;
}

/** Read table state from a URLSearchParams instance */
export function parseTableStateFromParams(
  params: URLSearchParams,
  prefix: string,
  defaultPageSize: number,
): TableUrlState {
  // URL is 1-based for readability, internal state remains 0-based.
  const urlPage = safeInt(params.get(buildKey(prefix, 'page')), 1, 1);
  return {
    page: Math.max(0, urlPage - 1),
    pageSize: safeInt(params.get(buildKey(prefix, 'pageSize')), defaultPageSize, 1),
    search: params.get(buildKey(prefix, 'search')) ?? '',
    sortModel: safeJsonParse<TableUrlSortModel | null>(params.get(buildKey(prefix, 'sort')), null),
    filters: normalizeFilters(
      safeJsonParse<TableUrlFilterRecord>(params.get(buildKey(prefix, 'filters')), {}),
    ),
  };
}

/** Write table state into an existing URLSearchParams (mutates in place) */
export function writeTableStateToParams(
  params: URLSearchParams,
  next: TableUrlState,
  prefix: string,
  defaultPageSize: number,
): void {
  const k = (name: string): string => buildKey(prefix, name);
  const normalizedFilters = normalizeFilters(next.filters);

  // omit defaults to keep URLs clean
  // URL is 1-based for readability, internal state remains 0-based.
  if (next.page > 0) params.set(k('page'), String(next.page + 1));
  else params.delete(k('page'));

  if (next.pageSize !== defaultPageSize) params.set(k('pageSize'), String(next.pageSize));
  else params.delete(k('pageSize'));

  if (next.search) params.set(k('search'), next.search);
  else params.delete(k('search'));

  if (next.sortModel) params.set(k('sort'), JSON.stringify(next.sortModel));
  else params.delete(k('sort'));

  if (Object.keys(normalizedFilters).length > 0) {
    params.set(k('filters'), JSON.stringify(normalizedFilters));
  } else params.delete(k('filters'));
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Syncs AdvancedTable state (page, pageSize, search, sort, filters) to/from
 * URL search params so the view is bookmarkable and shareable.
 *
 * Behaviour:
 * - `replaceState` for search / sort / filter / pageSize changes (no back-stack pollution)
 * - `pushState` for page navigation when pushForPageChanges=true (browser back = prev page)
 * - Reads initial state from Next.js `useSearchParams` (SSR-safe)
 * - Re-syncs on browser back/forward via `popstate`
 *
 * Usage (self-contained inside AdvancedTable via enableUrlSync):
 * ```tsx
 * <AdvancedTable enableUrlSync urlPrefix="quotes" ... />
 * ```
 *
 * Usage (external, for server-side consumers):
 * ```tsx
 * const url = useTableUrlState({ prefix: 'quotes', defaultPageSize: 10 });
 * <AdvancedTable
 *   page={url.state.page}
 *   sortModel={url.state.sortModel}
 *   onPageChange={url.setPage}
 *   onSortChange={url.setSortModel}
 * />
 * ```
 */
export function useTableUrlState(options: UseTableUrlStateOptions = {}): UseTableUrlStateReturn {
  const { prefix = '', defaultPageSize = 10, pushForPageChanges = true } = options;

  // useSearchParams is the SSR-safe way to read params in Next.js App Router.
  // It does NOT require useRouter — remove that import entirely.
  const searchParams = useSearchParams();

  // Initialise from current URL params (SSR-safe: searchParams is available on first render)
  const [state, setState] = useState<TableUrlState>(() =>
    parseTableStateFromParams(
      new URLSearchParams(searchParams.toString()),
      prefix,
      defaultPageSize,
    ),
  );

  // Stable ref so URL-write callbacks always see the latest state without deps
  const stateRef = useRef(state);
  stateRef.current = state;

  // Stable option refs so effects don't need to re-register when options change
  const prefixRef = useRef(prefix);
  prefixRef.current = prefix;
  const defaultPageSizeRef = useRef(defaultPageSize);
  defaultPageSizeRef.current = defaultPageSize;

  // ── Write state → browser URL ─────────────────────────────────────────────

  const writeUrl = useCallback((next: TableUrlState, push: boolean): void => {
    // Preserve all OTHER params already in the URL (e.g. from other tables / filters)
    const params = new URLSearchParams(window.location.search);
    writeTableStateToParams(params, next, prefixRef.current, defaultPageSizeRef.current);

    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;

    if (push) window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
  }, []); // no deps — reads via refs

  // ── Sync state ← URL on browser back/forward ──────────────────────────────

  useEffect(() => {
    const handler = (): void => {
      const params = new URLSearchParams(window.location.search);
      setState(parseTableStateFromParams(params, prefixRef.current, defaultPageSizeRef.current));
    };
    window.addEventListener('popstate', handler);
    return (): void => window.removeEventListener('popstate', handler);
  }, []); // registers once; reads options via stable refs

  // ── Public setters (all stable — empty or minimal deps) ───────────────────

  const commitState = useCallback(
    (next: TableUrlState, push: boolean): void => {
      // Keep ref in sync immediately so multiple setters fired in the same tick
      // (e.g. setPageSize -> setPage(0)) never read stale state.
      stateRef.current = next;
      setState(next);
      writeUrl(next, push);
    },
    [writeUrl],
  );

  const setPage = useCallback(
    (page: number): void => {
      if (page === stateRef.current.page) return;
      const next = { ...stateRef.current, page };
      commitState(next, pushForPageChanges);
    },
    [commitState, pushForPageChanges],
  );

  const setPageSize = useCallback(
    (pageSize: number): void => {
      if (pageSize === stateRef.current.pageSize && stateRef.current.page === 0) return;
      const next = { ...stateRef.current, pageSize, page: 0 };
      commitState(next, false);
    },
    [commitState],
  );

  const setSearch = useCallback(
    (search: string): void => {
      if (search === stateRef.current.search && stateRef.current.page === 0) return;
      const next = { ...stateRef.current, search, page: 0 };
      commitState(next, false);
    },
    [commitState],
  );

  const setSortModel = useCallback(
    (sortModel: TableUrlSortModel | null): void => {
      const prevSort = stateRef.current.sortModel;
      const sameSort =
        (prevSort == null && sortModel == null) ||
        (prevSort?.field === sortModel?.field && prevSort?.direction === sortModel?.direction);
      if (sameSort && stateRef.current.page === 0) return;
      const next = { ...stateRef.current, sortModel, page: 0 };
      commitState(next, false);
    },
    [commitState],
  );

  const setFilters = useCallback(
    (filters: TableUrlFilterRecord): void => {
      const normalized = normalizeFilters(filters);
      const prevFiltersJson = JSON.stringify(normalizeFilters(stateRef.current.filters));
      const nextFiltersJson = JSON.stringify(normalized);
      if (prevFiltersJson === nextFiltersJson && stateRef.current.page === 0) return;
      const next = { ...stateRef.current, filters: normalized, page: 0 };
      commitState(next, false);
    },
    [commitState],
  );

  const resetAll = useCallback((): void => {
    const next: TableUrlState = {
      page: 0,
      pageSize: defaultPageSizeRef.current,
      search: '',
      sortModel: null,
      filters: {},
    };
    commitState(next, false);
  }, [commitState]);

  return { state, setPage, setPageSize, setSearch, setSortModel, setFilters, resetAll };
}

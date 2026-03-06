'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

import type { BaseFilters, PaginationState, SortingState } from './types';

import { useDebounce } from '@/lib/hooks/use-debounce';

interface UseQueryStateOptions<F extends BaseFilters> {
  defaults?: Partial<F>;
  defaultSort?: { field: string; order: 'ASC' | 'DESC' };
  defaultPageSize?: number;
  searchDebounceMs?: number;
  syncToUrl?: boolean;
  persistKey?: string;
}

export interface UseQueryStateReturn<F extends BaseFilters> {
  search: string;
  setSearch: (value: string) => void;
  debouncedSearch: string;
  clearSearch: () => void;

  filters: Partial<F>;
  setFilter: <K extends keyof F>(key: K, value: F[K]) => void;
  setFilters: (updates: Partial<F>) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;

  pagination: PaginationState;
  sorting: SortingState;
  activeFilters: F;
  setMeta: (meta: { total: number; totalPages: number }) => void;
}

const PAGINATION_KEYS = new Set(['page', 'limit', 'search', 'sortBy', 'sortOrder']);

function readPersistedState<F>(persistKey: string): Partial<F> | null {
  try {
    const stored = localStorage.getItem(persistKey);
    return stored ? (JSON.parse(stored) as Partial<F>) : null;
  } catch {
    return null;
  }
}

function persistState<F>(persistKey: string, filters: Partial<F>): void {
  try {
    localStorage.setItem(persistKey, JSON.stringify(filters));
  } catch {
    // localStorage might be full or unavailable
  }
}

export function useQueryState<F extends BaseFilters>(
  options?: UseQueryStateOptions<F>,
): UseQueryStateReturn<F> {
  const searchParams = useSearchParams();
  const syncToUrl = options?.syncToUrl ?? true;
  const defaultPageSize = options?.defaultPageSize ?? 10;
  const searchDebounceMs = options?.searchDebounceMs ?? 550;

  const defaultsRef = useRef(options?.defaults);
  defaultsRef.current = options?.defaults;

  // Resolve initial state: URL > localStorage > defaults
  const initialState = useMemo(() => {
    const persisted = options?.persistKey ? readPersistedState<F>(options.persistKey) : null;
    const urlPage = searchParams.get('page');
    const urlSearch = searchParams.get('search');
    const urlSortBy = searchParams.get('sortBy');
    const urlSortOrder = searchParams.get('sortOrder');

    const initialFilters: Record<string, unknown> = {};
    if (options?.defaults) {
      for (const [key, value] of Object.entries(options.defaults)) {
        if (PAGINATION_KEYS.has(key)) continue;
        const urlVal = syncToUrl ? searchParams.get(key) : null;
        const persistedVal = persisted ? (persisted as Record<string, unknown>)[key] : undefined;
        initialFilters[key] = urlVal ?? persistedVal ?? value;
      }
    }

    return {
      page: urlPage ? Number(urlPage) : 1,
      search: urlSearch ?? '',
      sortBy: urlSortBy ?? options?.defaultSort?.field,
      sortOrder: (urlSortOrder as 'ASC' | 'DESC') ?? options?.defaultSort?.order ?? 'DESC',
      filters: initialFilters as Partial<F>,
    };
  }, []);

  const [page, setPageRaw] = useState(initialState.page);
  const [pageSize, setPageSizeRaw] = useState(defaultPageSize);
  const [search, setSearchRaw] = useState(initialState.search);
  const [sortBy, setSortBy] = useState<string | undefined>(initialState.sortBy);
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>(initialState.sortOrder);
  const [filters, setFiltersRaw] = useState<Partial<F>>(initialState.filters);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const debouncedSearch = useDebounce(search, searchDebounceMs);

  // Auto-reset page to 1 when filters, search, or pageSize change
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setPageRaw(1);
  }, [debouncedSearch, pageSize, filters]);

  // URL sync via replaceState
  const userChangedRef = useRef(false);
  useEffect(() => {
    if (!syncToUrl || !userChangedRef.current) return;
    userChangedRef.current = false;

    const params = new URLSearchParams(window.location.search);

    if (page > 1) params.set('page', String(page));
    else params.delete('page');

    if (search) params.set('search', search);
    else params.delete('search');

    if (sortBy && sortBy !== options?.defaultSort?.field) params.set('sortBy', sortBy);
    else params.delete('sortBy');

    if (sortOrder !== (options?.defaultSort?.order ?? 'DESC')) params.set('sortOrder', sortOrder);
    else params.delete('sortOrder');

    const defaults = options?.defaults ?? {};
    for (const [key, value] of Object.entries(filters)) {
      if (PAGINATION_KEYS.has(key)) continue;
      const defaultVal = (defaults as Record<string, unknown>)[key];
      if (
        value !== undefined &&
        value !== null &&
        value !== '' &&
        value !== defaultVal &&
        value !== 'all'
      ) {
        params.set(key, String(value));
      } else {
        params.delete(key);
      }
    }

    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', url);
  }, [page, search, sortBy, sortOrder, filters, syncToUrl]);

  // localStorage persistence
  useEffect(() => {
    if (options?.persistKey) {
      persistState(options.persistKey, filters);
    }
  }, [filters, options?.persistKey]);

  // Popstate handler for browser back/forward
  useEffect(() => {
    if (!syncToUrl) return;
    const handler = () => {
      const params = new URLSearchParams(window.location.search);
      const urlPage = params.get('page');
      if (urlPage) setPageRaw(Number(urlPage));
      const urlSearch = params.get('search');
      if (urlSearch !== null) setSearchRaw(urlSearch);
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [syncToUrl]);

  const markUserChange = useCallback(() => {
    userChangedRef.current = true;
  }, []);

  const setSearch = useCallback(
    (value: string) => {
      markUserChange();
      setSearchRaw(value);
    },
    [markUserChange],
  );

  const clearSearch = useCallback(() => {
    markUserChange();
    setSearchRaw('');
  }, [markUserChange]);

  const setFilter = useCallback(
    <K extends keyof F>(key: K, value: F[K]) => {
      markUserChange();
      setFiltersRaw((prev) => ({ ...prev, [key]: value }));
    },
    [markUserChange],
  );

  const setFiltersCallback = useCallback(
    (updates: Partial<F>) => {
      markUserChange();
      setFiltersRaw((prev) => ({ ...prev, ...updates }));
    },
    [markUserChange],
  );

  const clearFilters = useCallback(() => {
    markUserChange();
    setFiltersRaw((options?.defaults ?? {}) as Partial<F>);
    setSearchRaw('');
  }, [markUserChange, options?.defaults]);

  const setPage = useCallback(
    (p: number) => {
      markUserChange();
      setPageRaw(p);
    },
    [markUserChange],
  );

  const setPageSize = useCallback(
    (size: number) => {
      markUserChange();
      setPageSizeRaw(size);
    },
    [markUserChange],
  );

  const hasActiveFilters = useMemo(() => {
    if (search) return true;
    const defaults = options?.defaults ?? {};
    for (const [key, value] of Object.entries(filters)) {
      if (PAGINATION_KEYS.has(key)) continue;
      const defaultVal = (defaults as Record<string, unknown>)[key];
      if (
        value !== undefined &&
        value !== null &&
        value !== '' &&
        value !== defaultVal &&
        value !== 'all'
      ) {
        return true;
      }
    }
    return false;
  }, [filters, search, options?.defaults]);

  const activeFilters = useMemo(
    () =>
      ({
        ...filters,
        page,
        limit: pageSize,
        search: debouncedSearch || undefined,
        sortBy,
        sortOrder,
      }) as F,
    [filters, page, pageSize, debouncedSearch, sortBy, sortOrder],
  );

  const setSorting = useCallback(
    (field: string, order?: 'ASC' | 'DESC') => {
      markUserChange();
      setSortBy(field);
      if (order) setSortOrder(order);
    },
    [markUserChange],
  );

  const toggleSort = useCallback(
    (field: string) => {
      markUserChange();
      if (sortBy === field) {
        setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
      } else {
        setSortBy(field);
        setSortOrder('ASC');
      }
    },
    [markUserChange, sortBy],
  );

  const clearSort = useCallback(() => {
    markUserChange();
    setSortBy(options?.defaultSort?.field);
    setSortOrder(options?.defaultSort?.order ?? 'DESC');
  }, [markUserChange, options?.defaultSort]);

  const setMeta = useCallback((meta: { total: number; totalPages: number }) => {
    setTotal(meta.total);
    setTotalPages(meta.totalPages);
  }, []);

  const pagination: PaginationState = useMemo(
    () => ({
      page,
      pageSize,
      total,
      totalPages,
      setPage,
      setPageSize,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    }),
    [page, pageSize, total, totalPages, setPage, setPageSize],
  );

  const sorting: SortingState = useMemo(
    () => ({
      sortBy,
      sortOrder,
      setSorting,
      toggleSort,
      clearSort,
    }),
    [sortBy, sortOrder, setSorting, toggleSort, clearSort],
  );

  return {
    search,
    setSearch,
    debouncedSearch,
    clearSearch,
    filters,
    setFilter,
    setFilters: setFiltersCallback,
    clearFilters,
    hasActiveFilters,
    pagination,
    sorting,
    activeFilters,
    setMeta,
  };
}

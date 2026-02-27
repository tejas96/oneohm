'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Centralized URL-synced filter state hook.
 *
 * - Reads initial values from URL search params
 * - Writes filter changes back to the URL via replaceState
 * - Syncs local state back from URL on browser back/forward (popstate)
 *
 * Usage:
 *   const { filters, setFilter, clearFilters } = useUrlFilters({ status: '', page: '1' });
 *   setFilter('status', 'active');        // updates both state + URL
 *   setFilter({ status: '', page: '1' }); // batch update
 *   clearFilters();                        // resets to defaults
 */
export function useUrlFilters<T extends Record<string, string>>(
  defaults: T,
): {
  filters: T;
  setFilter: ((key: keyof T, value: string) => void) & ((updates: Partial<T>) => void);
  clearFilters: () => void;
} {
  const searchParams = useSearchParams();

  const readFromUrl = useCallback((): T => {
    const result = { ...defaults };
    for (const key of Object.keys(defaults)) {
      result[key as keyof T] = (searchParams.get(key) ?? defaults[key]) as T[keyof T];
    }
    return result;
  }, [searchParams, defaults]);

  const [filters, setFilters] = useState<T>(readFromUrl);
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  // Sync from URL on browser back/forward
  useEffect(() => {
    const handler = () => {
      const params = new URLSearchParams(window.location.search);
      const updated = { ...defaultsRef.current };
      for (const key of Object.keys(defaultsRef.current)) {
        updated[key as keyof T] = (params.get(key) ?? defaultsRef.current[key]) as T[keyof T];
      }
      setFilters(updated);
    };

    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // Also sync when searchParams changes (e.g. from programmatic navigation)
  useEffect(() => {
    setFilters(readFromUrl());
  }, [searchParams, readFromUrl]);

  const writeToUrl = useCallback((updated: T) => {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updated)) {
      if (value && value !== defaultsRef.current[key as keyof T]) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', url);
  }, []);

  const setFilter = useCallback(
    (keyOrUpdates: keyof T | Partial<T>, value?: string) => {
      setFilters((prev) => {
        const next: Record<string, string> = { ...prev };
        if (typeof keyOrUpdates === 'string') {
          next[keyOrUpdates] = value ?? '';
        } else {
          Object.assign(next, keyOrUpdates);
        }
        const typed = next as T;
        writeToUrl(typed);
        return typed;
      });
    },
    [writeToUrl],
  );

  const clearFilters = useCallback(() => {
    setFilters(defaultsRef.current);
    writeToUrl(defaultsRef.current);
  }, [writeToUrl]);

  return { filters, setFilter: setFilter as never, clearFilters };
}

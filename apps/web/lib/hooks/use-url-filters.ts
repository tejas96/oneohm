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
  setFilter: (keyOrUpdates: keyof T | Partial<T>, value?: string) => void;
  clearFilters: () => void;
} {
  const searchParams = useSearchParams();

  const readFromUrl = useCallback((): T => {
    const result = { ...defaults };
    let key: keyof T;
    for (key in defaults) {
      const defaultValue = defaults[key];
      const urlValue = searchParams.get(String(key));
      const val = urlValue !== null ? urlValue : defaultValue;
      Object.assign(result, { [key]: val });
    }
    return result;
  }, [searchParams, defaults]);

  const [filters, setFilters] = useState<T>(readFromUrl);
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  const userChangedRef = useRef(false);

  // Sync from URL on browser back/forward
  useEffect(() => {
    const handler = () => {
      const params = new URLSearchParams(window.location.search);
      const updated = { ...defaultsRef.current };
      let key: keyof T;
      for (key in defaultsRef.current) {
        const defaultValue = defaultsRef.current[key];
        const urlValue = params.get(String(key));
        const val = urlValue !== null ? urlValue : defaultValue;
        Object.assign(updated, { [key]: val });
      }
      setFilters(updated);
    };

    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // Sync from URL when searchParams change (handles client-side Next.js Link / router navigation)
  useEffect(() => {
    if (userChangedRef.current) return;

    const updated = { ...defaultsRef.current };
    let hasChanges = false;
    let key: keyof T;
    for (key in defaultsRef.current) {
      const defaultValue = defaultsRef.current[key];
      const urlValue = searchParams.get(String(key));
      const val = urlValue !== null ? urlValue : defaultValue;
      if (filters[key] !== val) {
        Object.assign(updated, { [key]: val });
        hasChanges = true;
      }
    }
    if (hasChanges) {
      setFilters(updated);
    }
  }, [searchParams, filters]);

  // Sync filter state → URL after render (only for user-initiated changes)
  useEffect(() => {
    if (!userChangedRef.current) return;
    userChangedRef.current = false;

    const params = new URLSearchParams(window.location.search);
    let key: keyof T;
    for (key in filters) {
      const value = filters[key];
      if (value && value !== defaultsRef.current[key]) {
        params.set(String(key), value);
      } else {
        params.delete(String(key));
      }
    }
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', url);
  }, [filters]);

  const setFilter = useCallback((keyOrUpdates: keyof T | Partial<T>, value?: string) => {
    userChangedRef.current = true;
    if (typeof keyOrUpdates === 'string') {
      setFilters((prev) => {
        const next = { ...prev };
        Object.assign(next, { [keyOrUpdates]: value ?? '' });
        return next;
      });
    } else if (typeof keyOrUpdates === 'object' && keyOrUpdates !== null) {
      setFilters((prev) => ({
        ...prev,
        ...keyOrUpdates,
      }));
    }
  }, []);

  const clearFilters = useCallback(() => {
    userChangedRef.current = true;
    setFilters(defaultsRef.current);
  }, []);

  return { filters, setFilter, clearFilters };
}

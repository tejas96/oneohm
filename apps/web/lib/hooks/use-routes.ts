'use client';

import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { buildRoute, type RoutePath, type RouteParams} from '@/lib/config/routes';

// Re-export types for convenience
export type { RoutePath, RouteParams, RouteParamTypes } from '@/lib/config/routes';
export { ROUTES } from '@/lib/config/routes';

/**
 * Navigation options for route transitions
 */
interface NavigateOptions {
  /** Use replace instead of push (no history entry) */
  replace?: boolean;
  /** Scroll to top after navigation */
  scroll?: boolean;
}

/**
 * useRoutes Hook
 * 
 * Comprehensive routing hook that provides:
 * - Type-safe navigation methods
 * - Current route data (pathname, params, query)
 * - Navigation state helpers
 * - Route building utilities
 * - Navigation safety (debounce, duplicate prevention)
 * 
 * @example
 * ```tsx
 * const { navigate, replace, goBack, pathname, query, buildUrl } = useRoutes();
 * 
 * // Navigate with type safety
 * navigate('/customers/[id]', { id: '123' });
 * 
 * // Replace current route
 * replace('/login', undefined, { redirect: '/dashboard' });
 * 
 * // Build URL without navigating
 * const url = buildUrl('/quotes/[id]', { id: quoteId });
 * ```
 */
export function useRoutes() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();

  // Track navigation state for duplicate prevention
  const lastNavigationRef = useRef<{ path: string; time: number } | null>(null);
  const NAVIGATION_DEBOUNCE_MS = 300;

  // Track previous route
  const [previousPath, setPreviousPath] = useState<string | null>(null);
  const currentPathRef = useRef(pathname);

  useEffect(() => {
    if (currentPathRef.current !== pathname) {
      setPreviousPath(currentPathRef.current);
      currentPathRef.current = pathname;
    }
  }, [pathname]);

  /**
   * Check if navigation should be prevented (duplicate/debounce)
   */
  const shouldPreventNavigation = useCallback((targetPath: string): boolean => {
    const now = Date.now();
    const last = lastNavigationRef.current;

    // Prevent duplicate navigation to same path within debounce period
    if (last?.path === targetPath && now - last.time < NAVIGATION_DEBOUNCE_MS) {
      return true;
    }

    lastNavigationRef.current = { path: targetPath, time: now };
    return false;
  }, []);

  /**
   * Navigate to a route (adds to history)
   */
  const navigate = useCallback(
    <T extends RoutePath>(
      path: T,
      pathParams?: RouteParams<T> extends undefined ? undefined : Partial<RouteParams<T>>,
      queryParams?: Record<string, string | number | boolean | undefined>,
      options?: Omit<NavigateOptions, 'replace'>
    ) => {
      const url = buildRoute(path, pathParams, queryParams);
      if (shouldPreventNavigation(url)) return;
      router.push(url, { scroll: options?.scroll ?? true });
    },
    [router, shouldPreventNavigation]
  );

  /**
   * Navigate to a route (replaces current history entry)
   */
  const replace = useCallback(
    <T extends RoutePath>(
      path: T,
      pathParams?: RouteParams<T> extends undefined ? undefined : Partial<RouteParams<T>>,
      queryParams?: Record<string, string | number | boolean | undefined>,
      options?: Omit<NavigateOptions, 'replace'>
    ) => {
      const url = buildRoute(path, pathParams, queryParams);
      if (shouldPreventNavigation(url)) return;
      router.replace(url, { scroll: options?.scroll ?? true });
    },
    [router, shouldPreventNavigation]
  );

  /**
   * Go back in history
   */
  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  /**
   * Go forward in history
   */
  const goForward = useCallback(() => {
    router.forward();
  }, [router]);

  /**
   * Refresh current route (re-fetch data)
   */
  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  /**
   * Prefetch a route for faster navigation
   */
  const prefetch = useCallback(
    <T extends RoutePath>(
      path: T,
      pathParams?: RouteParams<T> extends undefined ? undefined : Partial<RouteParams<T>>
    ) => {
      const url = buildRoute(path, pathParams);
      router.prefetch(url);
    },
    [router]
  );

  /**
   * Get query params as a typed object
   */
  const query = useMemo(() => {
    const result: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }, [searchParams]);

  /**
   * Get a specific query param
   */
  const getQueryParam = useCallback(
    (key: string): string | null => {
      return searchParams.get(key);
    },
    [searchParams]
  );

  /**
   * Update query params without full navigation
   */
  const setQueryParams = useCallback(
    (
      newParams: Record<string, string | number | boolean | undefined | null>,
      options?: { replace?: boolean }
    ) => {
      const current = new URLSearchParams(searchParams.toString());

      Object.entries(newParams).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          current.delete(key);
        } else {
          current.set(key, String(value));
        }
      });

      const queryString = current.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

      if (options?.replace) {
        router.replace(newUrl, { scroll: false });
      } else {
        router.push(newUrl, { scroll: false });
      }
    },
    [pathname, router, searchParams]
  );

  /**
   * Check if current route matches a pattern
   */
  const isActive = useCallback(
    (path: string, exact = false): boolean => {
      if (exact) {
        return pathname === path;
      }
      return pathname.startsWith(path);
    },
    [pathname]
  );

  /**
   * Get route segments
   */
  const segments = useMemo(() => {
    return pathname.split('/').filter(Boolean);
  }, [pathname]);

  return {
    // Navigation methods
    navigate,
    replace,
    goBack,
    goForward,
    refresh,
    prefetch,

    // Route data
    pathname,
    params: params as Record<string, string>,
    query,
    searchParams,
    segments,

    // Query param helpers
    getQueryParam,
    setQueryParams,

    // Route state
    previousPath,
    isActive,

    // URL building (re-exported from config)
    buildRoute,

    // Raw router (escape hatch)
    router,
  };
}

export default useRoutes;

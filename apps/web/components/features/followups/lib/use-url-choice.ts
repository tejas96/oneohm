'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

/**
 * One choice kept in the address bar as `?key=value`, so Back, a refresh and a
 * shared link all return to it. The default value is left out of the URL.
 *
 * Written with `replaceState`, like the rest of a list's view state: choosing
 * a tab is not a place to go Back to. `accept` turns the raw parameter into a
 * valid value or null (it is typed by hand as often as it is clicked), and
 * must be a stable function.
 */
export function useUrlChoice<T extends string>(
  key: string,
  fallback: T,
  accept: (raw: string) => T | null,
): [T, (next: T) => void] {
  const searchParams = useSearchParams();
  const [value, setValue] = useState<T>(() => {
    const raw = searchParams.get(key);
    return (raw ? accept(raw) : null) ?? fallback;
  });

  // Browser Back / Forward within the page: follow the URL.
  useEffect(() => {
    const follow = (): void => {
      const raw = new URLSearchParams(window.location.search).get(key);
      setValue((raw ? accept(raw) : null) ?? fallback);
    };
    window.addEventListener('popstate', follow);
    return () => window.removeEventListener('popstate', follow);
  }, [key, fallback, accept]);

  const choose = useCallback(
    (next: T): void => {
      setValue(next);
      const params = new URLSearchParams(window.location.search);
      if (next === fallback) params.delete(key);
      else params.set(key, next);
      const query = params.toString();
      window.history.replaceState(
        null,
        '',
        query ? `${window.location.pathname}?${query}` : window.location.pathname,
      );
    },
    [key, fallback],
  );

  return [value, choose];
}

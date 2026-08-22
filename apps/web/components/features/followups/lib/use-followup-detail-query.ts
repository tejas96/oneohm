'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect } from 'react';

import { isValidFollowupId } from './followup-href';

/**
 * URL-backed follow-up detail state for customer and property detail pages.
 *
 * `followupId` survives refresh; closing strips only that param and keeps
 * `tab`, `docProperty`, and anything else on the query string.
 */
export function useFollowupDetailQuery(): {
  followupId: string | null;
  openFollowup: (id: string) => void;
  closeFollowup: () => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get('followupId');
  const followupId = raw && isValidFollowupId(raw) ? raw : null;

  // Drop malformed ids so refresh does not leave a dead param on the URL.
  useEffect(() => {
    if (!raw || isValidFollowupId(raw)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('followupId');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [raw, pathname, router, searchParams]);

  const openFollowup = useCallback(
    (id: string): void => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'followups');
      params.set('followupId', id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const closeFollowup = useCallback((): void => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('followupId');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  return { followupId, openFollowup, closeFollowup };
}

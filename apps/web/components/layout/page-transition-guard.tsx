'use client';

import LinearProgress from '@mui/material/LinearProgress';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useRef, useState } from 'react';

interface PageTransitionGuardProps {
  children: ReactNode;
}

/**
 * Detects client-side navigation in the Next.js App Router and briefly
 * shows a top progress bar while the new page component is mounting.
 *
 * Problem this solves:
 * Next.js App Router uses React.startTransition for soft navigation, which
 * intentionally keeps the PREVIOUS page's rendered output on screen while
 * the next page loads. This causes confusing "stale" table content — e.g.
 * warehouse rows appearing on the All Stock page and vice-versa.
 *
 * Fix: watch for pathname changes and briefly dim + overlay the stale content
 * so users see a clear visual indicator that a navigation is in progress,
 * instead of mismatched data from the previous page.
 */
export function PageTransitionGuard({ children }: PageTransitionGuardProps): React.JSX.Element {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    if (prevPathname.current === pathname) return;

    // Pathname changed — the new page has finished mounting.
    prevPathname.current = pathname;
    setNavigating(false);
  }, [pathname]);

  // Intercept clicks on links to set the navigating state immediately before
  // the URL updates, giving us an optimistic loading indicator.
  useEffect(() => {
    const handleClick = (e: MouseEvent): void => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:')) return;
      // Only trigger for same-origin links
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname !== window.location.pathname) {
          setNavigating(true);
        }
      } catch {
        // ignore malformed hrefs
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return (
    <>
      {/* Top progress bar — fixed at viewport top, visible only during navigation */}
      <div
        className="fixed left-0 top-0 z-[9999] w-full"
        style={{ pointerEvents: 'none' }}
        aria-hidden
      >
        <LinearProgress
          sx={{
            height: 2,
            opacity: navigating ? 1 : 0,
            transition: 'opacity 150ms ease',
            borderRadius: 0,
          }}
        />
      </div>

      {/* Full-viewport overlay that covers stale page content during navigation */}
      {navigating && (
        <div
          className="fixed inset-0 z-[9998] bg-background-secondary/50 transition-opacity"
          style={{ pointerEvents: 'none' }}
          aria-hidden
        />
      )}

      {children}
    </>
  );
}

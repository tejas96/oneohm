import { useEffect } from 'react';

/**
 * Locks body scroll when `locked` is true. Restores original overflow on cleanup.
 * Safe to use with multiple concurrent consumers — each instance manages its own
 * lifecycle, but the last unmount will restore scrolling.
 */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = original;
    };
  }, [locked]);
}

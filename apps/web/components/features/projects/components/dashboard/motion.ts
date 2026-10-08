'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';

/** Entrance: fade + rise once. `motion-reduce` turns it off. */
export const ENTER = 'animate-fade-in motion-reduce:animate-none';

export function enterDelay(index: number, stepMs = 60): CSSProperties {
  return { animationDelay: `${index * stepMs}ms`, animationFillMode: 'both' };
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = (): void => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

/**
 * Counts up from 0 on first render, then tweens from the shown value to each
 * new target — a filter change slides the number instead of replaying the
 * entrance. Returns a float; format it at the call site.
 */
export function useCountUp(target: number, durationMs = 600): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(0);
  const shown = useRef(0);

  useEffect(() => {
    if (reduced) {
      shown.current = target;
      setValue(target);
      return undefined;
    }
    const from = shown.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number): void => {
      const p = Math.min(1, (now - start) / durationMs);
      const next = from + (target - from) * (1 - (1 - p) ** 3);
      shown.current = next;
      setValue(next);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reduced]);

  return value;
}

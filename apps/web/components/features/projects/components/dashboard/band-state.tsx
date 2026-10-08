'use client';

import Skeleton from '@mui/material/Skeleton';
import { RotateCw } from 'lucide-react';
import * as React from 'react';

export function BandError({ what, onRetry }: { what: string; onRetry: () => void }): React.JSX.Element {
  return (
    <section className="rounded-xl bg-surface p-5 shadow-e2">
      <p className="text-sm text-foreground-secondary">Could not load {what}.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-pill bg-accent-subtle px-3 text-xs font-medium text-primary-dark"
      >
        <RotateCw className="size-3" aria-hidden="true" />
        Retry
      </button>
    </section>
  );
}

/** Same shapes as the real bands, so nothing jumps when data lands. */
export function DashboardSkeleton(): React.JSX.Element {
  const card = 'rounded-xl bg-surface p-5 shadow-e2';
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={card}>
            <Skeleton variant="text" width="50%" />
            <Skeleton variant="text" width="40%" height={36} />
            <Skeleton variant="text" width="70%" />
          </div>
        ))}
      </div>
      <div className={card}>
        <Skeleton variant="rounded" height={190} />
      </div>
      <div className="grid gap-5 lg:grid-cols-5">
        <div className={`${card} lg:col-span-3`}>
          <Skeleton variant="rounded" height={260} />
        </div>
        <div className={`${card} lg:col-span-2`}>
          <Skeleton variant="rounded" height={260} />
        </div>
      </div>
    </div>
  );
}

'use client';

import Skeleton from '@mui/material/Skeleton';
import * as React from 'react';

/** Same shapes as the real bands, so nothing jumps when data lands. */
export function QuotesDashboardSkeleton(): React.JSX.Element {
  const card = 'rounded-xl bg-surface p-5 shadow-e2';
  return (
    <div className="flex flex-col gap-5" role="status" aria-busy="true">
      <span className="sr-only">Loading dashboard</span>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={card}>
            <Skeleton variant="text" width="50%" />
            <Skeleton variant="text" width="40%" height={36} />
            <Skeleton variant="text" width="70%" />
          </div>
        ))}
      </div>
      <div className={card}>
        <Skeleton variant="rounded" height={150} />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className={`${card} lg:col-span-3`}>
          <Skeleton variant="rounded" height={220} />
        </div>
        <div className={`${card} lg:col-span-2`}>
          <Skeleton variant="rounded" height={220} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className={card}>
          <Skeleton variant="rounded" height={200} />
        </div>
        <div className={card}>
          <Skeleton variant="rounded" height={200} />
        </div>
      </div>
      <div className={card}>
        <Skeleton variant="rounded" height={240} />
      </div>
    </div>
  );
}

'use client';

import { Box, Skeleton } from '@mui/material';
import type { JSX } from 'react';

export function TabSkeleton(): JSX.Element {
  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Skeleton variant="rounded" height={36} />
      <Skeleton variant="rounded" height={120} />
      <Skeleton variant="rounded" height={120} />
    </Box>
  );
}

export function PageSkeleton(): JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Skeleton variant="text" width={200} height={20} />
      <Skeleton variant="rounded" height={72} />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={64} />
        ))}
      </Box>
      <Skeleton variant="rounded" height={48} />
      <Skeleton variant="rounded" height={320} />
    </Box>
  );
}

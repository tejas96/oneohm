'use client';

import { Box, Skeleton, Stack } from '@mui/material';
import type { JSX } from 'react';

const CARD_RADIUS = 'var(--radius-card-functional)';

/**
 * Placeholder for a tab body.
 *
 * Shaped like the two-column overview rather than three stacked grey bars, so
 * the switch from skeleton to content doesn't reflow the page under the
 * pointer.
 */
export function TabSkeleton(): JSX.Element {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 320px) minmax(0, 1fr)' },
        gap: 2,
        alignItems: 'start',
      }}
    >
      <Skeleton variant="rounded" height={320} sx={{ borderRadius: CARD_RADIUS }} />
      <Stack gap={2}>
        <Skeleton variant="rounded" height={150} sx={{ borderRadius: CARD_RADIUS }} />
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: CARD_RADIUS }} />
      </Stack>
    </Box>
  );
}

/** Full-page placeholder: breadcrumb, identity band, metric row, tab rail, body. */
export function PageSkeleton(): JSX.Element {
  return (
    <Box>
      <Skeleton variant="text" width={180} height={16} sx={{ mb: 1.5 }} />
      <Skeleton variant="rounded" height={124} sx={{ borderRadius: CARD_RADIUS, mb: 2 }} />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 1.5,
          mb: 2,
        }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} variant="rounded" height={96} sx={{ borderRadius: CARD_RADIUS }} />
        ))}
      </Box>
      <Skeleton
        variant="rounded"
        height={42}
        sx={{ borderRadius: 'var(--radius-pill)', mb: 2, maxWidth: 720 }}
      />
      <TabSkeleton />
    </Box>
  );
}

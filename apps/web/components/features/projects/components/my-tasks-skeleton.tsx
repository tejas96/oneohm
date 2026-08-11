'use client';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

/** Mirrors the real group: an overline header on the canvas, then a floating card. */
export function MyTasksSkeleton(): React.JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {Array.from({ length: 3 }).map((_, gi) => (
        <Box key={gi}>
          {/* Group header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1, px: 0.5 }}>
            <Skeleton variant="text" width={88} height={11} />
            <Skeleton variant="rounded" width={22} height={18} sx={{ borderRadius: 999 }} />
            <Box sx={{ flex: 1, height: '1px', bgcolor: 'var(--ds-canvas-sunken)' }} />
          </Box>

          {/* Card */}
          <Box
            sx={{
              bgcolor: 'var(--ds-surface)',
              borderRadius: 'var(--radius-card-functional)',
              boxShadow: 'var(--shadow-e2)',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ height: 32, bgcolor: 'var(--ds-surface-alt)' }} />
            {Array.from({ length: 3 }).map((_, ri) => (
              <Box
                key={ri}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  pl: 2.5,
                  pr: 2,
                  py: 1.25,
                  boxShadow: ri < 2 ? 'inset 0 -1px 0 var(--ds-canvas-sunken)' : 'none',
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Skeleton variant="text" width="46%" height={14} />
                  <Skeleton variant="text" width="28%" height={11} />
                </Box>
                <Skeleton
                  variant="rounded"
                  width={72}
                  height={23}
                  sx={{ borderRadius: 999, display: { xs: 'none', md: 'block' } }}
                />
                <Skeleton
                  variant="text"
                  width={56}
                  height={14}
                  sx={{ display: { xs: 'none', md: 'block' } }}
                />
                <Skeleton
                  variant="rounded"
                  width={88}
                  height={4}
                  sx={{ borderRadius: 999, display: { xs: 'none', md: 'block' } }}
                />
                <Skeleton variant="rounded" width={96} height={23} sx={{ borderRadius: 999 }} />
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export function SummaryChipsSkeleton(): React.JSX.Element {
  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      {[104, 108, 122, 142].map((w) => (
        <Skeleton key={w} variant="rounded" width={w} height={36} sx={{ borderRadius: 999 }} />
      ))}
    </Box>
  );
}

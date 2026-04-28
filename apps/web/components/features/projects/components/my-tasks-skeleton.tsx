'use client';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

export function MyTasksSkeleton(): React.JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {Array.from({ length: 3 }).map((_, gi) => (
        <Box key={gi}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Skeleton variant="rectangular" width={14} height={14} />
            <Skeleton variant="circular" width={10} height={10} />
            <Skeleton variant="text" width={96} height={16} />
            <Skeleton variant="rounded" width={32} height={20} />
          </Box>
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
            }}
          >
            {Array.from({ length: 3 }).map((_, ri) => (
              <Box
                key={ri}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  py: 1.5,
                  borderBottom: ri < 2 ? '1px solid' : 'none',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width={160} height={12} sx={{ mb: 0.5 }} />
                  <Skeleton variant="text" width={224} height={16} />
                </Box>
                <Skeleton variant="text" width={64} height={12} sx={{ ml: 2 }} />
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
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" width={110} height={32} />
      ))}
    </Box>
  );
}

'use client';

import { Box, Paper, Skeleton } from '@mui/material';
import React from 'react';

function CardSkeleton(): React.JSX.Element {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        mb: 1,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Skeleton variant="text" width="60%" height={12} sx={{ mb: 0.5 }} />
      <Skeleton variant="text" width="90%" height={14} />
      <Skeleton variant="text" width="75%" height={14} sx={{ mb: 1 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton variant="text" width={50} height={12} />
        <Skeleton variant="circular" width={20} height={20} />
      </Box>
    </Paper>
  );
}

interface KanbanCardSkeletonProps {
  count?: number;
}

export function KanbanCardSkeleton({ count = 3 }: KanbanCardSkeletonProps): React.JSX.Element {
  return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          // Using index key is safe here - these are static skeleton placeholders with no reordering
          <CardSkeleton key={`skeleton-${i}`} />
        ))}
    </>
  );
}

KanbanCardSkeleton.displayName = 'KanbanCardSkeleton';

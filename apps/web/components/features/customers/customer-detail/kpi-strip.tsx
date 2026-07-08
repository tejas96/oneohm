'use client';

import { Box, Card, CardContent, Skeleton, Typography } from '@mui/material';
import type { JSX } from 'react';

export interface KpiItem {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'warning' | 'error';
}

interface CustomerDetailKpiStripProps {
  items: KpiItem[];
  isLoading?: boolean;
}

export function CustomerDetailKpiStrip({
  items,
  isLoading,
}: CustomerDetailKpiStripProps): JSX.Element {
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
          gap: 1,
          mb: 2,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={72} />
        ))}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
        gap: 1,
        mb: 2,
      }}
      aria-label="Key metrics"
    >
      {items.map((item) => (
        <Card key={item.label} variant="outlined" sx={{ borderRadius: 1 }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.625rem' }}
            >
              {item.label}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                mt: 0.5,
                fontSize: '1.125rem',
                fontWeight: 600,
                color:
                  item.tone === 'warning'
                    ? 'warning.dark'
                    : item.tone === 'error'
                      ? 'error.main'
                      : 'text.primary',
              }}
            >
              {item.value}
            </Typography>
            {item.hint && (
              <Typography variant="caption" color="text.disabled" display="block">
                {item.hint}
              </Typography>
            )}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

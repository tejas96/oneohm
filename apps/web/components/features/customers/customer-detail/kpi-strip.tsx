'use client';

import { Box, Card, CardContent, Skeleton, Typography } from '@mui/material';
import type { JSX } from 'react';

/**
 * NOTE: this component is shared with the **property** detail page
 * (`features/properties/property-detail/property-detail-page.tsx`), which is
 * not part of the customer redesign. It is deliberately left as-is so that
 * page keeps rendering exactly as before; the customer detail page no longer
 * uses it and renders the shared `KpiStripe` tiles instead.
 */

export interface KpiItem {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'warning' | 'error';
  /**
   * Makes the tile a button. Set only where there is something to fix — a tile
   * that merely reports a value should not look actionable.
   */
  onClick?: () => void;
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
        <Card
          key={item.label}
          variant="outlined"
          onClick={item.onClick}
          role={item.onClick ? 'button' : undefined}
          tabIndex={item.onClick ? 0 : undefined}
          onKeyDown={
            item.onClick
              ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    item.onClick?.();
                  }
                }
              : undefined
          }
          sx={{
            borderRadius: 1,
            ...(item.onClick && {
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }),
          }}
        >
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

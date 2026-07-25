'use client';

import { Box, Skeleton } from '@mui/material';
import { type JSX, useMemo } from 'react';

import type { DiscomListStats } from '../hooks/use-discoms-admin';

import { color, crm, radius, shadow } from '@/lib/theme/tokens';
import { formatNumber } from '@/lib/utils';

interface DiscomKpiCardsProps {
  stats?: DiscomListStats;
  total?: number;
  loading?: boolean;
}

interface StatCardProps {
  label: string;
  value: string;
  loading: boolean;
}

function StatCard({ label, value, loading }: StatCardProps): JSX.Element {
  return (
    <Box
      sx={{
        height: crm['kpi-height'],
        px: 2,
        py: 1.75,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: color.surface,
        borderRadius: radius['card-functional'],
        boxShadow: shadow.e2,
      }}
    >
      <Box
        component="span"
        sx={{
          fontSize: 'var(--text-overline-size)',
          fontWeight: 700,
          letterSpacing: 'var(--text-overline-track)',
          textTransform: 'uppercase',
          color: color['text-tertiary'],
        }}
      >
        {label}
      </Box>
      {loading ? (
        <Skeleton variant="text" width="60%" height={28} />
      ) : (
        <Box
          component="span"
          sx={{
            fontSize: 'var(--text-h3-size)',
            lineHeight: 'var(--text-h3-line)',
            letterSpacing: 'var(--text-h3-track)',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </Box>
      )}
    </Box>
  );
}

export function DiscomKpiCards({
  stats,
  total,
  loading = false,
}: DiscomKpiCardsProps): JSX.Element {
  const cards = useMemo(
    () => [
      { label: 'DISCOM entries', value: formatNumber(total ?? 0) },
      { label: 'Circles covered', value: formatNumber(stats?.circles ?? 0) },
      { label: 'Active', value: formatNumber(stats?.active ?? 0) },
      { label: 'Sites mapped', value: formatNumber(stats?.linkedProperties ?? 0) },
    ],
    [stats, total],
  );

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${crm['kpi-min-width']}, 1fr))`,
        gap: 1.5,
      }}
    >
      {cards.map((card) => (
        <StatCard key={card.label} label={card.label} value={card.value} loading={loading} />
      ))}
    </Box>
  );
}

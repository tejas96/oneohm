'use client';

import { Box, Chip } from '@mui/material';
import { type JSX } from 'react';

import type { ResellerPeriod } from '@/lib/hooks/resources/resellers';
import { color, crm, radius, shadow } from '@/lib/theme/tokens';

/**
 * Copied from `finance-payables-page.tsx`'s local `StatCard` and exported —
 * it stays local to each feature, as the house does; this is not the shared
 * `stat-card` component, it is this feature's own copy.
 */
export function StatCard({
  label,
  value,
  note,
  danger,
}: {
  label: string;
  value: string;
  note: string;
  danger?: boolean;
}): JSX.Element {
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
      <Box
        component="span"
        sx={{
          fontSize: 'var(--text-h3-size)',
          lineHeight: 'var(--text-h3-line)',
          letterSpacing: 'var(--text-h3-track)',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: danger ? color.danger : undefined,
        }}
      >
        {value}
      </Box>
      <Box sx={{ fontSize: crm['text-row-sm'], color: color['text-tertiary'] }}>{note}</Box>
    </Box>
  );
}

export function PeriodChips({
  value,
  onChange,
}: {
  value: ResellerPeriod;
  onChange: (p: ResellerPeriod) => void;
}): JSX.Element {
  const items: Array<{ key: ResellerPeriod; label: string }> = [
    { key: 'month', label: 'This month' },
    { key: 'fy', label: 'This FY' },
    { key: 'all', label: 'All time' },
  ];
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
      {items.map((i) => (
        <Chip
          key={i.key}
          label={i.label}
          size="small"
          color={value === i.key ? 'primary' : 'default'}
          variant={value === i.key ? 'filled' : 'outlined'}
          onClick={() => onChange(i.key)}
        />
      ))}
      <Box component="span" sx={{ fontSize: crm['text-row-sm'], color: color['text-tertiary'] }}>
        Leads and win rate count by lead date. Revenue counts by the date the deal was won.
      </Box>
    </Box>
  );
}

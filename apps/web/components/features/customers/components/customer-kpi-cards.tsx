'use client';

import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { Box, Skeleton } from '@mui/material';
import { type JSX, useMemo } from 'react';

import { useCustomerOverviewStats } from '../hooks/use-customers';

import { color, crm, radius, shadow } from '@/lib/theme/tokens';
import { formatCurrencyCompact, formatNumber } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  delta: string;
  /**
   * Direction of the delta, which is about desirability, not arithmetic.
   * "4 ageing" is a `down` — the number rising is bad news.
   */
  deltaDir: 'up' | 'down';
  loading: boolean;
}

function StatCard({ label, value, delta, deltaDir, loading }: StatCardProps): JSX.Element {
  const DeltaIcon = deltaDir === 'up' ? TrendingUpIcon : TrendingDownIcon;
  const deltaColor = deltaDir === 'up' ? color.success : color.danger;

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

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          fontSize: crm['text-row-sm'],
          color: deltaColor,
        }}
      >
        {loading ? (
          <Skeleton variant="text" width="45%" height={14} />
        ) : (
          <>
            <DeltaIcon sx={{ fontSize: 14 }} />
            {delta}
          </>
        )}
      </Box>
    </Box>
  );
}

/**
 * The four KPI cards above the customer grid: customers, sites, open pipeline
 * and quotes awaiting a reply.
 *
 * Every figure is organisation-wide and independent of the table's filters —
 * they answer "how is the pipeline doing", not "what am I looking at". Tying
 * them to the filter model would make the same card show different numbers
 * depending on an unrelated search box.
 */
export function CustomerKpiCards(): JSX.Element {
  const { data, isLoading } = useCustomerOverviewStats();

  const cards = useMemo<Omit<StatCardProps, 'loading'>[]>(() => {
    const stats = data;
    return [
      {
        label: 'Customers',
        value: formatNumber(stats?.customers ?? 0),
        delta: `${formatNumber(stats?.customersThisMonth ?? 0)} this month`,
        deltaDir: 'up',
      },
      {
        label: 'Sites',
        value: formatNumber(stats?.sites ?? 0),
        delta: `${formatNumber(stats?.sitesThisMonth ?? 0)} this month`,
        deltaDir: 'up',
      },
      {
        label: 'Pipeline',
        value: formatCurrencyCompact(stats?.pipelineValue ?? 0),
        delta: `${formatNumber(stats?.awaitingReply ?? 0)} quotes open`,
        deltaDir: 'up',
      },
      {
        label: 'Awaiting reply',
        value: formatNumber(stats?.awaitingReply ?? 0),
        delta: `${formatNumber(stats?.awaitingAgeing ?? 0)} ageing`,
        deltaDir: 'down',
      },
    ];
  }, [data]);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${crm['kpi-min-width']}, 1fr))`,
        gap: 1.5,
        flexShrink: 0,
      }}
    >
      {cards.map((card) => (
        <StatCard key={card.label} {...card} loading={isLoading} />
      ))}
    </Box>
  );
}

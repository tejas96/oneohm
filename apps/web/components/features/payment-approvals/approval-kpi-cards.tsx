'use client';

import ScheduleIcon from '@mui/icons-material/Schedule';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { Box, Skeleton } from '@mui/material';
import type { JSX, ReactNode } from 'react';

import { useApprovalSummary } from '@/lib/hooks/resources/payment-approvals';
import { color, crm, radius, shadow } from '@/lib/theme/tokens';
import { formatPaise } from '@/lib/utils/paise';

interface StatCardProps {
  label: string;
  value: ReactNode;
  note: string;
  /** Desirability, not arithmetic: a queue growing older is bad news. */
  noteDir: 'good' | 'bad' | 'idle';
  icon?: JSX.Element;
  loading: boolean;
}

function StatCard({ label, value, note, noteDir, icon, loading }: StatCardProps): JSX.Element {
  const noteColor =
    noteDir === 'good' ? color.success : noteDir === 'bad' ? color.danger : color['text-tertiary'];

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
          color: noteColor,
        }}
      >
        {icon}
        {note}
      </Box>
    </Box>
  );
}

/**
 * Queue headlines.
 *
 * The value waiting matters more than the count: "3 pending" says nothing about
 * whether ₹500 or ₹5,00,000 is sitting unconfirmed on a customer's balance.
 */
export function ApprovalKpiCards(): JSX.Element {
  const { data, isLoading } = useApprovalSummary();

  const oldest = data?.oldestPendingHours ?? null;
  const oldestLabel =
    oldest === null ? '—' : oldest < 24 ? `${oldest}h` : `${Math.floor(oldest / 24)}d`;

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
      }}
    >
      <StatCard
        label="Awaiting approval"
        value={String(data?.pendingCount ?? 0)}
        note={(data?.pendingCount ?? 0) === 0 ? 'nothing waiting' : 'needs a second pair of eyes'}
        noteDir={(data?.pendingCount ?? 0) === 0 ? 'good' : 'idle'}
        loading={isLoading}
      />
      {/* In and out on their own lines: added together they made one figure
          that was neither what is coming in nor what is going out. */}
      <StatCard
        label="Value waiting"
        value={
          <Box
            component="span"
            sx={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              columnGap: 1,
              fontSize: 'var(--text-body-size)',
              lineHeight: 1.35,
            }}
          >
            <Box component="span" sx={{ fontWeight: 500, color: color['text-tertiary'] }}>
              In
            </Box>
            <span>{formatPaise(data?.pendingInPaise ?? 0)}</span>
            <Box component="span" sx={{ fontWeight: 500, color: color['text-tertiary'] }}>
              Out
            </Box>
            <span>{formatPaise(data?.pendingOutPaise ?? 0)}</span>
          </Box>
        }
        note="not counted in any balance yet"
        noteDir="idle"
        loading={isLoading}
      />
      <StatCard
        label="Longest wait"
        value={oldestLabel}
        // Over two days queued is worth chasing, so it reads red.
        note={
          oldest === null ? 'queue is clear' : oldest >= 48 ? 'chase this' : 'within a day or two'
        }
        noteDir={oldest !== null && oldest >= 48 ? 'bad' : 'idle'}
        icon={oldest !== null && oldest >= 48 ? <ScheduleIcon sx={{ fontSize: 13 }} /> : undefined}
        loading={isLoading}
      />
      <StatCard
        label="Approved today"
        value={String(data?.approvedToday ?? 0)}
        note="posted to the ledger"
        noteDir={(data?.approvedToday ?? 0) > 0 ? 'good' : 'idle'}
        icon={(data?.approvedToday ?? 0) > 0 ? <TaskAltIcon sx={{ fontSize: 13 }} /> : undefined}
        loading={isLoading}
      />
    </Box>
  );
}

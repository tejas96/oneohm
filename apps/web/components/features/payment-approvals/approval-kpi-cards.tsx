'use client';

import ScheduleIcon from '@mui/icons-material/Schedule';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import type { JSX, ReactNode } from 'react';

import { BONE, StatTile, StatTiles } from '@/components/shared/calm-list';
import { useApprovalSummary } from '@/lib/hooks/resources/payment-approvals';
import { color } from '@/lib/theme/tokens';
import { cn } from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

/** Desirability, not arithmetic: a queue growing older is bad news. */
type NoteDir = 'good' | 'bad' | 'idle';

/** The line under a figure, in the colour of its news, with its icon. */
function Note({
  dir,
  icon,
  children,
}: {
  dir: NoteDir;
  icon?: JSX.Element;
  children: ReactNode;
}): JSX.Element {
  return (
    <span
      className="flex items-center gap-1"
      style={{
        color: dir === 'good' ? color.success : dir === 'bad' ? color.danger : undefined,
      }}
    >
      {icon}
      {children}
    </span>
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

  /** The figure, or a placeholder bar while the summary loads. */
  const figure = (value: ReactNode): ReactNode =>
    isLoading ? <span className={cn(BONE, 'block h-7 w-3/5')} /> : value;

  return (
    <StatTiles label="Approval queue" className="mb-2.5 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Awaiting approval"
        value={figure(String(data?.pendingCount ?? 0))}
        note={
          <Note dir={(data?.pendingCount ?? 0) === 0 ? 'good' : 'idle'}>
            {(data?.pendingCount ?? 0) === 0 ? 'nothing waiting' : 'needs a second pair of eyes'}
          </Note>
        }
      />
      {/* In and out on their own lines: added together they made one figure
          that was neither what is coming in nor what is going out. */}
      <StatTile
        label="Value waiting"
        value={figure(
          <span className="grid grid-cols-[auto_1fr] gap-x-2 text-[14px] leading-[1.35]">
            <span className="font-medium text-foreground-tertiary">In</span>
            <span>{formatPaise(data?.pendingInPaise ?? 0)}</span>
            <span className="font-medium text-foreground-tertiary">Out</span>
            <span>{formatPaise(data?.pendingOutPaise ?? 0)}</span>
          </span>,
        )}
        note={<Note dir="idle">not counted in any balance yet</Note>}
      />
      <StatTile
        label="Longest wait"
        value={figure(oldestLabel)}
        // Over two days queued is worth chasing, so it reads red.
        note={
          <Note
            dir={oldest !== null && oldest >= 48 ? 'bad' : 'idle'}
            icon={
              oldest !== null && oldest >= 48 ? <ScheduleIcon sx={{ fontSize: 13 }} /> : undefined
            }
          >
            {oldest === null
              ? 'queue is clear'
              : oldest >= 48
                ? 'chase this'
                : 'within a day or two'}
          </Note>
        }
      />
      <StatTile
        label="Approved today"
        value={figure(String(data?.approvedToday ?? 0))}
        note={
          <Note
            dir={(data?.approvedToday ?? 0) > 0 ? 'good' : 'idle'}
            icon={
              (data?.approvedToday ?? 0) > 0 ? <TaskAltIcon sx={{ fontSize: 13 }} /> : undefined
            }
          >
            posted to the ledger
          </Note>
        }
      />
    </StatTiles>
  );
}

'use client';

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { type JSX } from 'react';

import { DetailCard, RowLink } from './primitives';
import { useCancellationCleanup } from '../../hooks';

import { ROUTES } from '@/lib/config/routes';

interface CancellationCleanupCardProps {
  projectId: string;
}

interface CleanupRow {
  key: string;
  text: string;
  /** Omitted where no screen resolves this yet — an honest plain line beats
   *  a link that goes nowhere. */
  href?: string;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/**
 * Shown only for a cancelled project. Reads the same cancellation-cleanup
 * response the header's title is built from — one query, one source of
 * truth, so the two cannot disagree — and goes one level deeper: which lines
 * are still open, and where to resolve each one.
 */
export function CancellationCleanupCard({
  projectId,
}: CancellationCleanupCardProps): JSX.Element | null {
  const cleanup = useCancellationCleanup(projectId);
  const data = cleanup.data;
  if (!data) return null;

  if (data.state === 'settled') {
    return (
      <DetailCard label="Cleanup" className="mt-4">
        <div className="flex items-center gap-2 py-1 text-[13px] text-foreground-secondary">
          <CheckCircleOutlineIcon sx={{ fontSize: 18, color: 'success.main' }} />
          Cancelled — settled. Nothing left to clean up.
        </div>
      </DetailCard>
    );
  }

  const rows: CleanupRow[] = [];
  if (data.unitsAtSite > 0) {
    rows.push({
      key: 'stock',
      text:
        `${plural(data.unitsAtSite, 'unit')} still at site` +
        (data.pendingReturns > 0 ? ` — ${plural(data.pendingReturns, 'pending return')}` : ''),
      href: ROUTES.INVENTORY.ALLOCATIONS,
    });
  }
  if (data.openPurchaseOrders > 0) {
    rows.push({
      key: 'po',
      text: plural(data.openPurchaseOrders, 'open purchase order'),
      href: ROUTES.INVENTORY.PURCHASE_ORDERS,
    });
  }
  if (data.unrecoveredCommissions > 0) {
    rows.push({
      key: 'commissions',
      text: plural(data.unrecoveredCommissions, 'unrecovered commission'),
    });
  }

  // Physically clear but not yet stamped settled is a genuinely momentary
  // state on a fresh cancel (the stock release runs right after the
  // transaction commits) or a not-yet-backfilled legacy row. Say so plainly
  // rather than showing an empty list or borrowing the "settled" wording.
  if (rows.length === 0) {
    return (
      <DetailCard label="Cleanup" className="mt-4">
        <div className="flex items-center gap-2 py-1 text-[13px] text-foreground-secondary">
          <CheckCircleOutlineIcon sx={{ fontSize: 18, color: 'success.main' }} />
          Nothing outstanding.
        </div>
      </DetailCard>
    );
  }

  return (
    <DetailCard label="Cleanup" aside={plural(rows.length, 'item') + ' open'} className="mt-4">
      <div className="flex flex-col gap-0.5">
        {rows.map((row) =>
          row.href ? (
            <RowLink key={row.key} href={row.href}>
              <WarningAmberOutlinedIcon sx={{ fontSize: 17, color: 'warning.main', flexShrink: 0 }} />
              <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{row.text}</span>
              <ChevronRightIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
            </RowLink>
          ) : (
            <div key={row.key} className="-mx-2.5 flex min-w-0 items-center gap-3 px-2.5 py-2">
              <WarningAmberOutlinedIcon sx={{ fontSize: 17, color: 'warning.main', flexShrink: 0 }} />
              <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{row.text}</span>
            </div>
          ),
        )}
      </div>
    </DetailCard>
  );
}

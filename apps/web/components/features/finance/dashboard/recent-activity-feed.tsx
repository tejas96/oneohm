'use client';

import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded';
import CallReceivedRoundedIcon from '@mui/icons-material/CallReceivedRounded';
import { formatTimeAgo } from '@tejas96/shared/utils';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { AmountCell } from '../shared';

import { MUITypography } from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';
import type { DashboardActivityItem } from '@/lib/hooks/resources';
import { cn } from '@/lib/utils';

/**
 * Compact "what's happened lately" feed — shows the last ~10 receipts
 * and expenses across the org so the dashboard isn't just KPIs +
 * charts. Each row deep-links to the underlying project so users can
 * jump from "this expense looks off" to the project page in one click.
 *
 * Cash-in (receipts) is rendered green with an inbound arrow; cash-out
 * (expenses) is red with an outbound arrow. Mirrors the cash-flow
 * chart's encoding to keep the dashboard internally consistent.
 *
 * Empty state intentionally inline (no card-in-card) since the host
 * panel already provides the framing.
 */
export interface RecentActivityFeedProps {
  items: DashboardActivityItem[];
  isLoading?: boolean;
}

export function RecentActivityFeed({
  items,
  isLoading,
}: RecentActivityFeedProps): React.JSX.Element {
  const router = useRouter();

  return (
    <div className="border-border-light flex h-full flex-col gap-3 rounded-xl border bg-surface p-card">
      <div className="flex items-baseline justify-between gap-2">
        <MUITypography variant="sectionTitle">Recent Activity</MUITypography>
        <span className="text-foreground-tertiary text-xs">Last 10 events</span>
      </div>

      <div className="flex flex-col">
        {isLoading && (
          <div className="text-foreground-tertiary py-8 text-center text-sm">Loading…</div>
        )}
        {!isLoading && items.length === 0 && (
          <div className="text-foreground-tertiary py-8 text-center text-sm">
            No recent finance activity
          </div>
        )}
        {!isLoading &&
          items.map((it) => {
            const isReceipt = it.type === 'receipt';
            const Icon = isReceipt ? CallReceivedRoundedIcon : ArrowOutwardRoundedIcon;
            const amountColored = isReceipt ? it.amount : -it.amount;
            return (
              <button
                key={`${it.type}-${it.id}`}
                type="button"
                onClick={() => router.push(ROUTES.PROJECTS.DETAIL.replace('[id]', it.projectId))}
                className="hover:bg-surface-secondary flex items-center gap-3 rounded-md px-2 py-2 text-left transition-colors"
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                    isReceipt ? 'bg-success/10 text-success' : 'bg-error/10 text-error',
                  )}
                >
                  <Icon sx={{ fontSize: 16 }} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-foreground truncate text-sm font-medium">
                    {it.projectName}
                  </div>
                  <div className="text-foreground-tertiary text-xs">
                    {isReceipt ? 'Receipt' : 'Expense'} · {formatTimeAgo(it.at)}
                  </div>
                </div>
                <div className="shrink-0">
                  <AmountCell value={amountColored} signed />
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}

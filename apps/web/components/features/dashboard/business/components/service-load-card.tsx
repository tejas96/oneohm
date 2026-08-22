'use client';

import * as React from 'react';

import { BusinessCard } from './business-card';
import { businessLinks } from '../lib/links';

import type { ServiceTicketStats } from '@/components/features/service-tickets/hooks/use-service-tickets';
import { CHART_COLORS } from '@/lib/charts/palette';
import { color } from '@/lib/theme/tokens';



interface ServiceLoadCardProps {
  stats: ServiceTicketStats | undefined;
  isError: boolean;
  onRetry: () => void;
}

/**
 * Ticket load, as a fixed frame of reference rather than a filtered view.
 *
 * These counts are org-wide and unaffected by the page's date range — the
 * endpoint takes no dates, and "how many tickets are open right now" is not a
 * question about a period. The aside says "all open tickets" so the range above
 * is not read as applying.
 */
export function ServiceLoadCard({
  stats,
  isError,
  onRetry,
}: ServiceLoadCardProps): React.JSX.Element {
  const active = (stats?.open ?? 0) + (stats?.inProgress ?? 0);
  const anyTickets =
    (stats?.open ?? 0) + (stats?.inProgress ?? 0) + (stats?.resolved ?? 0) + (stats?.closed ?? 0) >
    0;

  const rows = [
    { label: 'Open', value: stats?.open ?? 0, fill: CHART_COLORS[2] },
    { label: 'In progress', value: stats?.inProgress ?? 0, fill: CHART_COLORS[3] },
    { label: 'Resolved', value: stats?.resolved ?? 0, fill: CHART_COLORS[1] },
    { label: 'Closed', value: stats?.closed ?? 0, fill: CHART_COLORS[8] },
  ];

  return (
    <BusinessCard
      label="Service load"
      aside="All open tickets"
      isError={isError}
      onRetry={onRetry}
      errorHeight={160}
      link={{ gate: 'service.view', label: 'Open service', href: businessLinks.service() }}
    >
      {!anyTickets ? (
        <p className="pb-2 pt-0.5 text-[13.5px] text-foreground-tertiary">No service tickets yet.</p>
      ) : (
        <>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[34px] font-bold tracking-[-0.03em] tabular-nums">{active}</span>
            <span className="text-[13px] text-foreground-secondary">active now</span>
          </div>
          <p
            className="mt-0.5 text-[12.5px]"
            style={{ color: stats?.urgent ? color.danger : color['text-tertiary'] }}
          >
            {stats?.urgent
              ? `${stats.urgent} urgent and still active`
              : 'No urgent tickets'}
          </p>
          <div className="grid grid-cols-4 gap-x-3 pt-4">
            {rows.map((row) => (
              <div key={row.label}>
                <div className="flex items-center gap-[5px] text-[11px] text-foreground-secondary">
                  <span
                    className="size-[7px] rounded-full"
                    style={{ background: row.fill }}
                    aria-hidden="true"
                  />
                  {row.label}
                </div>
                <div className="mt-1.5 text-[18px] font-medium tracking-[-0.02em] tabular-nums">
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </BusinessCard>
  );
}

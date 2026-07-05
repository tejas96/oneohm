'use client';

import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import { Skeleton } from '@mui/material';
import * as React from 'react';

import { MUIAvatar, MUITypography } from '@/components/ui';
import type { PipelineLeaderboardEntry } from '@/lib/hooks/resources';
import { formatCurrency } from '@/lib/utils';

interface SalespersonLeaderboardProps {
  entries: PipelineLeaderboardEntry[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function SalespersonLeaderboard({
  entries,
  isLoading,
  isError,
  onRetry,
}: SalespersonLeaderboardProps): React.JSX.Element {
  if (isLoading) {
    return <Skeleton variant="rounded" height={320} className="rounded-lg" />;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border-light bg-white p-4 text-center">
        <MUITypography variant="body" className="text-foreground-secondary">
          Failed to load leaderboard.
        </MUITypography>
        <button type="button" onClick={onRetry} className="mt-2 text-sm font-medium text-primary">
          Retry
        </button>
      </div>
    );
  }

  const mostlyUnassigned =
    entries.length > 0 && entries.every((e) => e.isUnassigned || e.pipelineValue === 0);

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-border-light bg-white p-4">
        <MUITypography variant="sectionTitle" className="mb-2">
          Salesperson Leaderboard
        </MUITypography>
        <MUITypography variant="body" className="text-foreground-secondary">
          No salesperson data for this period.
        </MUITypography>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-light bg-white p-4 shadow-sm">
      <MUITypography variant="sectionTitle" className="mb-4">
        Salesperson Leaderboard
      </MUITypography>
      {mostlyUnassigned && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-background-secondary p-3">
          <GroupOutlinedIcon className="mt-0.5 text-foreground-tertiary" fontSize="small" />
          <MUITypography variant="timestamp" className="text-foreground-secondary">
            Most deals are unassigned. Assign salespersons on quotes or customers to unlock
            leaderboard insights.
          </MUITypography>
        </div>
      )}
      <div className="space-y-3">
        {entries.slice(0, 8).map((entry, index) => (
          <div
            key={entry.salesPersonId ?? 'unassigned'}
            className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-background-secondary"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="w-5 text-center text-xs font-medium text-foreground-tertiary">
                {index + 1}
              </span>
              <MUIAvatar
                name={entry.salesPersonName}
                size="sm"
                className={entry.isUnassigned ? 'opacity-60' : undefined}
              />
              <div className="min-w-0">
                <MUITypography variant="bodyPrimary" className="truncate">
                  {entry.salesPersonName}
                </MUITypography>
                <MUITypography variant="finePrint" className="text-foreground-tertiary">
                  {entry.wonCount} won · {entry.winRate}% win rate
                </MUITypography>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <MUITypography variant="bodyPrimary">
                {formatCurrency(entry.pipelineValue)}
              </MUITypography>
              <MUITypography variant="finePrint" className="text-foreground-tertiary">
                {entry.propertyCount} opportunities
              </MUITypography>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

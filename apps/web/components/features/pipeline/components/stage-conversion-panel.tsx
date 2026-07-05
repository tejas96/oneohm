'use client';

import { Skeleton } from '@mui/material';
import * as React from 'react';

import { MUITypography } from '@/components/ui';
import type { PipelineFunnelStage } from '@/lib/hooks/resources';

interface StageConversionPanelProps {
  stages: PipelineFunnelStage[];
  isLoading: boolean;
}

export function StageConversionPanel({
  stages,
  isLoading,
}: StageConversionPanelProps): React.JSX.Element {
  if (isLoading) {
    return <Skeleton variant="rounded" height={240} className="rounded-lg" />;
  }

  const transitions = stages
    .map((stage, index) => {
      if (index === 0) return null;
      const prev = stages[index - 1];
      if (!prev) return null;
      const rate =
        stage.conversionRateFromPrevious ??
        (prev.count > 0 ? Math.round((stage.count / prev.count) * 1000) / 10 : 0);
      return { from: prev.label, to: stage.label, rate };
    })
    .filter(Boolean) as Array<{ from: string; to: string; rate: number }>;

  if (transitions.length === 0) {
    return (
      <div className="rounded-lg border border-border-light bg-white p-4">
        <MUITypography variant="body" className="text-foreground-secondary">
          No conversion data available.
        </MUITypography>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-light bg-white p-4 shadow-sm">
      <MUITypography variant="sectionTitle" className="mb-4">
        Stage Conversion Rates
      </MUITypography>
      <div className="space-y-4">
        {transitions.map((t) => (
          <div key={`${t.from}-${t.to}`} className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <MUITypography variant="timestamp" className="truncate text-foreground-secondary">
                {t.from}
              </MUITypography>
              <span className="text-foreground-tertiary">→</span>
              <MUITypography variant="bodyPrimary" className="truncate">
                {t.to}
              </MUITypography>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(t.rate, 100)}%` }}
                />
              </div>
              <MUITypography variant="bodyPrimary" className="w-12 text-right">
                {t.rate}%
              </MUITypography>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

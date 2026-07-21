'use client';

import { Skeleton } from '@mui/material';
import * as React from 'react';

import { PIPELINE_STAGE_CONFIG } from '../constants';
import {
  computeDiscStackGeometry,
  FunnelDiscAnnotation,
  FunnelDiscStackSvg,
  LostAnnotation,
} from './funnel-disc-stack';

import { MUITypography } from '@/components/ui';
import type { PipelineFunnelStage } from '@/lib/hooks/resources';
import { formatCurrency } from '@/lib/utils';

interface SalesFunnelChartProps {
  stages: PipelineFunnelStage[];
  lostCount: number;
  lostValue: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

function buildStageColorMap(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(PIPELINE_STAGE_CONFIG).map(([id, cfg]) => [id, cfg.chartStroke]),
  );
}

export function SalesFunnelChart({
  stages,
  lostCount,
  lostValue,
  isLoading,
  isError,
  onRetry,
}: SalesFunnelChartProps): React.JSX.Element {
  const [hoveredStageId, setHoveredStageId] = React.useState<string | null>(null);
  const instanceId = React.useId().replace(/:/g, '');

  const geometry = React.useMemo(
    () => computeDiscStackGeometry(stages, buildStageColorMap()),
    [stages],
  );

  // Matches the "NEW LEADS" row value directly below — total quote value across
  // all leads in the cohort, regardless of quote status (draft, sent, won, etc.).
  const headerValue = stages[0]?.value ?? 0;

  if (isLoading) {
    return <Skeleton variant="rounded" height={480} className="rounded-lg" />;
  }

  if (isError) {
    return (
      <div className="flex h-[480px] flex-col items-center justify-center rounded-lg shadow-e2 bg-white p-4">
        <MUITypography variant="body" className="text-foreground-secondary">
          Failed to load pipeline data.
        </MUITypography>
        <button type="button" onClick={onRetry} className="mt-2 text-sm font-medium text-primary">
          Retry
        </button>
      </div>
    );
  }

  if (stages.length === 0 || stages.every((d) => d.count === 0)) {
    return (
      <div className="flex h-[480px] items-center justify-center rounded-lg shadow-e2 bg-white p-4">
        <MUITypography variant="body" className="text-foreground-secondary">
          No pipeline data for the selected period.
        </MUITypography>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl shadow-e2 bg-gradient-to-b from-white to-background-secondary/30 p-5 shadow-sm sm:p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <MUITypography variant="sectionTitle">Pipeline Flow</MUITypography>
          <MUITypography variant="timestamp" className="mt-1 text-foreground-secondary">
            {stages[0]?.count.toLocaleString('en-IN') ?? 0} opportunities ·{' '}
            {headerValue > 0 ? formatCurrency(headerValue) : 'no quoted value yet'}
          </MUITypography>
        </div>
        {lostCount > 0 && <LostAnnotation lostCount={lostCount} lostValue={lostValue} />}
      </div>

      {/* Desktop: disc stack left, numbered annotations right */}
      <div className="hidden gap-10 sm:grid sm:grid-cols-[minmax(0,300px)_1fr]">
        <div className="flex justify-center">
          <div style={{ height: geometry.totalHeight, width: 300 }}>
            <FunnelDiscStackSvg
              geometry={geometry}
              idPrefix={`funnel-${instanceId}`}
              hoveredStageId={hoveredStageId}
              onStageHover={setHoveredStageId}
            />
          </div>
        </div>

        <div className="relative" style={{ height: geometry.totalHeight }}>
          {geometry.discs.map((disc) => (
            <FunnelDiscAnnotation
              key={disc.stage.id}
              disc={disc}
              totalHeight={geometry.totalHeight}
              isHovered={hoveredStageId === disc.stage.id}
              onHover={(hovered) => setHoveredStageId(hovered ? disc.stage.id : null)}
              variant="side"
            />
          ))}
        </div>
      </div>

      {/* Mobile: disc stack on top, stacked annotation list below */}
      <div className="sm:hidden">
        <div className="flex justify-center py-2">
          <div style={{ height: geometry.totalHeight * 0.8, width: 230 }}>
            <FunnelDiscStackSvg
              geometry={geometry}
              idPrefix={`funnel-mobile-${instanceId}`}
              hoveredStageId={hoveredStageId}
              onStageHover={setHoveredStageId}
            />
          </div>
        </div>

        <div className="mt-5 space-y-1 divide-y divide-border-light">
          {geometry.discs.map((disc) => (
            <div key={disc.stage.id} className="pt-3 first:pt-0">
              <FunnelDiscAnnotation
                disc={disc}
                totalHeight={geometry.totalHeight}
                isHovered={hoveredStageId === disc.stage.id}
                onHover={(hovered) => setHoveredStageId(hovered ? disc.stage.id : null)}
                variant="stacked"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

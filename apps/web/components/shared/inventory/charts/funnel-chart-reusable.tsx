'use client';

import * as React from 'react';

import { ChartShell, type ChartShellProps } from './chart-shell';
import type { FunnelStageInput } from './types';

import { FunnelChart, type FunnelStage as ExistingFunnelStage } from '@/components/shared/charts';


/**
 * Adapter over the existing `shared/charts/FunnelChart` that
 *   * accepts the `FunnelResponse` shape returned by the inventory
 *     stats endpoints (allocation funnel, dispatch funnel),
 *   * applies a soft progression-aware palette (start neutral, build
 *     intent toward "completed/delivered" success), and
 *   * embeds the chart inside the shared `ChartShell` so loading /
 *     empty / error / titled states are consistent with every other
 *     inventory chart.
 */

export interface FunnelChartReusableProps
  extends Pick<ChartShellProps, 'title' | 'description' | 'height' | 'isLoading' | 'isEmpty' | 'error' | 'action' | 'className'> {
  /** Stages in funnel order (top-of-funnel first). */
  stages: ReadonlyArray<FunnelStageInput>;
  /** Show conversion rates between adjacent stages. Defaults to true. */
  showConversionRates?: boolean;
  /** Stage click handler — passes the stage as it was supplied. */
  onStageClick?: (stage: FunnelStageInput) => void;
}

/**
 * Progression palette: each stage darkens slightly toward "complete".
 * Soft tints (slate / sky / teal / emerald) keep the chart readable
 * without screaming for attention the way pure brand colours do.
 * Index 0 = top-of-funnel; the last colour caps a 5+ stage funnel.
 */
const FUNNEL_BG_CLASSES: readonly string[] = [
  'bg-slate-400',
  'bg-sky-500',
  'bg-teal-500',
  'bg-emerald-500',
  'bg-emerald-600',
];

export function FunnelChartReusable({
  stages,
  showConversionRates = true,
  onStageClick,
  ...shellProps
}: FunnelChartReusableProps): React.JSX.Element {
  const adapted: ExistingFunnelStage[] = React.useMemo(
    () =>
      stages.map((stage, index) => ({
        id: stage.id,
        label: stage.label,
        value: stage.value,
        color: FUNNEL_BG_CLASSES[index % FUNNEL_BG_CLASSES.length],
      })),
    [stages],
  );

  const isEmpty = shellProps.isEmpty ?? stages.length === 0;
  const handleStageClick = onStageClick
    ? (stage: ExistingFunnelStage) => {
        const original = stages.find((s) => s.id === stage.id);
        if (original) onStageClick(original);
      }
    : undefined;

  return (
    <ChartShell {...shellProps} isEmpty={isEmpty}>
      <div className="flex h-full w-full items-center justify-center overflow-hidden">
        <FunnelChart
          stages={adapted}
          showConversionRates={showConversionRates}
          showValues
          onStageClick={handleStageClick}
          stageHeight={32}
          gap={4}
          showLegend={false}
        />
      </div>
    </ChartShell>
  );
}

FunnelChartReusable.displayName = 'FunnelChartReusable';

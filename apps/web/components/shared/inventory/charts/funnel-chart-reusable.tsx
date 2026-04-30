'use client';

import * as React from 'react';

import { ChartShell, type ChartShellProps } from './chart-shell';
import type { FunnelStageInput } from './types';

import { FunnelChart, type FunnelStage as ExistingFunnelStage } from '@/components/shared/charts';
import { CHART_SERIES_COLORS } from '@/lib/charts';


/**
 * Adapter over the existing `shared/charts/FunnelChart` that
 *   * accepts the `FunnelResponse` shape returned by the inventory
 *     stats endpoints (allocation funnel, dispatch funnel),
 *   * applies the canonical chart palette so funnel colours stay in
 *     sync with the rest of the dashboard, and
 *   * embeds the chart inside the shared `ChartShell` so loading /
 *     empty / error / titled states are consistent with every other
 *     inventory chart.
 *
 * Why a thin adapter and not a rewrite: the existing `FunnelChart` is
 * already a clean reusable component with conversion-rate connectors
 * and clickable stages. The only friction was the call sites had to
 * compute `bg-*` Tailwind classes themselves and remember to pass a
 * loading state — both of which this wrapper takes care of.
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
 * Tailwind classes corresponding 1:1 to the canonical chart palette.
 * Required because the existing `FunnelChart` paints stages with
 * Tailwind classes (`bg-*`) rather than raw hex strings, so this
 * adapter has to translate the palette into the matching class names.
 *
 * Order MUST match `CHART_SERIES_COLORS` so a given stage index maps
 * to the same colour it would in any other inventory chart.
 */
const FUNNEL_BG_CLASSES: readonly string[] = [
  'bg-chart-1',
  'bg-chart-2',
  'bg-chart-3',
  'bg-chart-4',
  'bg-chart-5',
];

if (FUNNEL_BG_CLASSES.length !== CHART_SERIES_COLORS.length) {
  /* istanbul ignore next */
  // Defensive: keep the local class list in step with the palette.
  throw new Error('FunnelChartReusable: palette class list must match CHART_SERIES_COLORS length');
}

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
      <div className="flex h-full w-full items-center">
        <FunnelChart
          stages={adapted}
          showConversionRates={showConversionRates}
          showValues
          onStageClick={handleStageClick}
        />
      </div>
    </ChartShell>
  );
}

FunnelChartReusable.displayName = 'FunnelChartReusable';

'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface FunnelStage {
  /** Unique identifier */
  id: string;
  /** Stage label */
  label: string;
  /** Stage value/count */
  value: number;
  /** Color for this stage */
  color?: string;
  /** Conversion rate from previous stage (calculated automatically if not provided) */
  conversionRate?: number;
}

export interface FunnelChartProps {
  /** Array of funnel stages (ordered from top to bottom) */
  stages: FunnelStage[];
  /** Called when a stage is clicked */
  onStageClick?: (stage: FunnelStage) => void;
  /** Show conversion rates between stages */
  showConversionRates?: boolean;
  /** Show values inside stages */
  showValues?: boolean;
  /** Minimum width percentage for smallest stage */
  minWidthPercent?: number;
  /** Height of each stage */
  stageHeight?: number;
  /** Gap between stages */
  gap?: number;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Default Colors
// ============================================================================

const DEFAULT_COLORS = ['bg-primary', 'bg-info', 'bg-success', 'bg-warning', 'bg-error'];

// ============================================================================
// Component
// ============================================================================

export function FunnelChart({
  stages,
  onStageClick,
  showConversionRates = true,
  showValues = true,
  minWidthPercent = 30,
  stageHeight = 56,
  gap = 2,
  className,
}: FunnelChartProps): React.JSX.Element {
  // Calculate width percentages for each stage
  const maxValue = Math.max(...stages.map((s) => s.value));

  const stagesWithWidth = stages.map((stage, index) => {
    // Calculate width based on value, with minimum width
    const rawPercent = maxValue > 0 ? (stage.value / maxValue) * 100 : minWidthPercent;
    const widthPercent = Math.max(rawPercent, minWidthPercent);

    // Calculate conversion rate from previous stage
    const prevStage = stages[index - 1];
    const conversionRate =
      prevStage && prevStage.value > 0
        ? Math.round((stage.value / prevStage.value) * 100)
        : undefined;

    return {
      ...stage,
      widthPercent,
      conversionRate: stage.conversionRate ?? conversionRate,
      color: stage.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    };
  });

  return (
    <div className={cn('w-full', className)}>
      <div className="flex flex-col items-center" style={{ gap: `${gap}px` }}>
        {stagesWithWidth.map((stage, index) => (
          <React.Fragment key={stage.id}>
            {/* Conversion rate connector */}
            {showConversionRates && stage.conversionRate !== undefined && index > 0 && (
              <div className="flex items-center gap-2 py-1">
                <div className="h-px w-8 bg-border-light" />
                <span className="text-xs font-medium text-foreground-secondary">
                  {stage.conversionRate}%
                </span>
                <div className="h-px w-8 bg-border-light" />
              </div>
            )}

            {/* Stage bar */}
            <button
              type="button"
              onClick={() => onStageClick?.(stage)}
              disabled={!onStageClick}
              className={cn(
                'relative flex items-center justify-center rounded-lg transition-all duration-fast',
                onStageClick && 'cursor-pointer hover:opacity-90 hover:scale-[1.02]',
                !onStageClick && 'cursor-default',
              )}
              style={{
                width: `${stage.widthPercent}%`,
                height: `${stageHeight}px`,
              }}
            >
              {/* Background */}
              <div className={cn('absolute inset-0 rounded-lg', stage.color)} />

              {/* Content */}
              <div className="relative z-10 flex items-center justify-between w-full px-4">
                <span className="text-sm font-medium text-white truncate">{stage.label}</span>
                {showValues && (
                  <span className="text-lg font-semibold text-white">
                    {stage.value.toLocaleString()}
                  </span>
                )}
              </div>
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap justify-center gap-4">
        {stagesWithWidth.map((stage) => (
          <div key={stage.id} className="flex items-center gap-2">
            <div className={cn('size-3 rounded-sm', stage.color)} />
            <span className="text-xs text-foreground-secondary">{stage.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

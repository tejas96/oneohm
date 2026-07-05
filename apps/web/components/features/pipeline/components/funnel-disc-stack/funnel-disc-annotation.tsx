'use client';

import * as React from 'react';

import { discCenterPercent, type FunnelDiscGeometry } from './funnel-disc-stack.utils';

import { MUITypography } from '@/components/ui';
import { cn, formatCurrency } from '@/lib/utils';

interface FunnelDiscAnnotationProps {
  disc: FunnelDiscGeometry;
  totalHeight: number;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
  variant?: 'side' | 'stacked';
}

export function FunnelDiscAnnotation({
  disc,
  totalHeight,
  isHovered,
  onHover,
  variant = 'side',
}: FunnelDiscAnnotationProps): React.JSX.Element {
  const { stage, index, color } = disc;
  const topPercent = discCenterPercent(disc, totalHeight);

  const negotiationNote =
    stage.negotiationCount !== undefined && stage.negotiationCount > 0
      ? `${stage.negotiationCount} in negotiation${
          stage.negotiationValue !== undefined && stage.negotiationValue > 0
            ? ` · ${formatCurrency(stage.negotiationValue)}`
            : ''
        }`
      : undefined;

  const content = (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg px-2 py-1.5 transition-colors duration-200',
        isHovered && 'bg-background-secondary/50',
      )}
    >
      <span
        className="shrink-0 text-3xl font-black leading-none tabular-nums opacity-90"
        style={{ color }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-2">
          <MUITypography variant="bodyPrimary" className="font-semibold uppercase tracking-wide">
            {stage.label}
          </MUITypography>
          {stage.conversionRateFromPrevious !== null && index > 0 && (
            <span className="rounded-full bg-background-secondary px-1.5 py-0.5 text-[10px] font-medium text-foreground-secondary">
              {stage.conversionRateFromPrevious}% conv.
            </span>
          )}
        </span>
        <span className="mt-0.5 block">
          <MUITypography variant="timestamp" className="text-foreground-secondary">
            {stage.count.toLocaleString('en-IN')} deals
            {stage.value > 0 ? ` · ${formatCurrency(stage.value)}` : ''}
          </MUITypography>
        </span>
        {negotiationNote && (
          <MUITypography variant="finePrint" className="mt-0.5 block text-warning">
            {negotiationNote}
          </MUITypography>
        )}
      </span>
    </div>
  );

  if (variant === 'stacked') {
    return <div className="w-full">{content}</div>;
  }

  return (
    <div
      className="absolute left-0 flex w-full items-center gap-3"
      style={{ top: `${topPercent}%`, transform: 'translateY(-50%)' }}
    >
      <svg
        width={40}
        height={2}
        viewBox="0 0 40 2"
        className="hidden shrink-0 sm:block"
        aria-hidden
      >
        <line
          x1={0}
          y1={1}
          x2={36}
          y2={1}
          stroke={color}
          strokeWidth={2}
          strokeDasharray="4 3"
          strokeLinecap="round"
          opacity={isHovered ? 0.85 : 0.5}
          style={{ transition: 'opacity 200ms ease-out' }}
        />
        <circle cx={38} cy={1} r={2.5} fill={color} opacity={isHovered ? 1 : 0.7} />
      </svg>
      <div className="min-w-0 flex-1">{content}</div>
    </div>
  );
}

interface LostAnnotationProps {
  lostCount: number;
  lostValue: number;
}

export function LostAnnotation({ lostCount, lostValue }: LostAnnotationProps): React.JSX.Element {
  if (lostCount <= 0) return <></>;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-error/20 bg-error/5 px-3 py-2">
      <MUITypography variant="finePrint" className="text-error">
        {lostCount} lost · {formatCurrency(lostValue)}
      </MUITypography>
    </div>
  );
}

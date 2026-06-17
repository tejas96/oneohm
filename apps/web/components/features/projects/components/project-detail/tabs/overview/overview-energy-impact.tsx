'use client';

import { computeSolarImpact } from '@tejas96/shared/utils';
import { SunMedium } from 'lucide-react';

import type { ProjectDetail } from '../../../../hooks/types';

import { Card, CardContent } from '@/components/ui';
import { formatCurrency, formatNumber, formatSystemSize } from '@/lib/utils/format';

interface OverviewEnergyImpactProps {
  project: ProjectDetail;
}

function buildMonthlySeries(monthlyBase: number): number[] {
  // Simple seasonal adjustment profile for visual trend only.
  const multipliers = [0.86, 0.9, 0.95, 1.02, 1.08, 1.12, 1.1, 1.04, 0.98, 0.93, 0.89, 0.85];
  return multipliers.map((m) => Math.round(monthlyBase * m));
}

const SPARKLINE_MONTH_LABELS = ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'] as const;

export function OverviewEnergyImpact({
  project,
}: OverviewEnergyImpactProps): React.ReactElement | null {
  if (!project.systemSizeKw || project.systemSizeKw <= 0) {
    return null;
  }

  const actualSizeKw = project.actualSystemSizeKw ?? project.systemSizeKw;

  const impact = computeSolarImpact({
    systemSizeKw: actualSizeKw,
    estimatedCost: project.estimatedCost,
  });
  const monthlySeries = buildMonthlySeries(impact.monthlyKwh);
  const max = Math.max(...monthlySeries, 1);
  const coords = monthlySeries.map((value, index) => {
    const x = (index / (monthlySeries.length - 1)) * 100;
    const y = 100 - (value / max) * 100;
    return { x, y };
  });
  const points = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const areaPath = `M 0,100 L ${coords.map((c) => `${c.x},${c.y}`).join(' L ')} L 100,100 Z`;

  return (
    <Card className="rounded-xl border-amber-100/70 bg-gradient-to-br from-amber-50/60 via-white to-success/5">
      <CardContent className="p-5 space-y-4 relative overflow-hidden">
        <span className="absolute top-5 right-5 z-10 text-[10px] font-medium px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
          FORECAST
        </span>
        <SunMedium className="absolute -right-6 -top-6 size-24 text-amber-300/40" />

        <div className="relative">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <SunMedium className="size-4 text-amber-500" />
            Energy & Environmental Impact
          </p>
          <p className="text-[11px] text-foreground-secondary mt-1">
            Forecast for {formatSystemSize(actualSizeKw)} kW system
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-amber-100 bg-white/80 p-3">
            <p className="text-[10px] text-amber-700 uppercase font-semibold">Generation</p>
            <p className="text-lg font-semibold text-foreground leading-none mt-1">
              {formatNumber(impact.annualKwh)}
            </p>
            <p className="text-[11px] text-foreground-secondary mt-1">kWh / year</p>
            <div className="text-[10px] text-green-600 mt-1 font-medium">
              ≈ {Math.round(impact.monthlyKwh / 30)} kWh/day avg
            </div>
          </div>
          <div className="rounded-lg border border-success/20 bg-white/80 p-3">
            <p className="text-[10px] text-success uppercase font-semibold">Savings</p>
            <p className="text-lg font-semibold text-foreground leading-none mt-1">
              {formatCurrency(impact.annualSavings)}
            </p>
            <p className="text-[11px] text-foreground-secondary mt-1">per year</p>
            <div className="text-[10px] text-gray-500 mt-1">
              ≈ {formatCurrency(impact.annualSavings / 12)}/month
            </div>
          </div>
          <div className="rounded-lg border border-success/20 bg-white/80 p-3">
            <p className="text-[10px] text-success uppercase font-semibold">CO2 Offset</p>
            <p className="text-lg font-semibold text-foreground leading-none mt-1">
              {formatNumber(impact.co2TonnesPerYear)}
            </p>
            <p className="text-[11px] text-foreground-secondary mt-1">tonnes / year</p>
            <div className="text-[10px] text-emerald-600 mt-1 font-medium">
              = {formatNumber(impact.treesEquivalent)} trees
            </div>
          </div>
          <div className="rounded-lg border border-primary/20 bg-white/80 p-3">
            <p className="text-[10px] text-primary uppercase font-semibold">Payback</p>
            <p className="text-lg font-semibold text-foreground leading-none mt-1">
              {impact.paybackYears != null ? `${impact.paybackYears}y` : '—'}
            </p>
            <p className="text-[11px] text-foreground-secondary mt-1">
              25yr savings {formatCurrency(impact.npv25YearRupees)}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border-light bg-white/70 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] text-foreground-secondary">Expected monthly generation</p>
            <p className="text-[10px] text-foreground-tertiary">kWh</p>
          </div>
          <svg viewBox="0 0 100 100" className="w-full h-16" preserveAspectRatio="none">
            <defs>
              <linearGradient id="overview-energy-spark-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(245 158 11)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="rgb(245 158 11)" stopOpacity="0.03" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#overview-energy-spark-fill)" />
            <polyline
              fill="none"
              stroke="currentColor"
              className="text-amber-500"
              strokeWidth="2"
              points={points}
            />
          </svg>
          <div className="flex justify-between text-[10px] text-foreground-tertiary mt-1 px-0.5">
            {SPARKLINE_MONTH_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

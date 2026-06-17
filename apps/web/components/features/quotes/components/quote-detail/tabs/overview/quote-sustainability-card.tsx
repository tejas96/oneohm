'use client';

import { Paper } from '@mui/material';
import { computeSolarImpact } from '@tejas96/shared/utils';
import { Leaf, PiggyBank, TrendingUp } from 'lucide-react';
import React, { useMemo } from 'react';

import { formatCurrency } from '@/lib/utils/format';

interface QuoteSustainabilityCardProps {
  actualKw: number;
  estimatedCost?: number;
}

export function QuoteSustainabilityCard({
  actualKw,
  estimatedCost,
}: QuoteSustainabilityCardProps): React.JSX.Element {
  const impact = useMemo(() => {
    return computeSolarImpact({
      systemSizeKw: actualKw,
      estimatedCost,
    });
  }, [actualKw, estimatedCost]);

  return (
    <Paper variant="outlined" className="p-5.5 rounded-xl border border-border bg-white shadow-sm">
      <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-1.5">
        🌍 Sustainability & Utility Savings
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-background-secondary p-4 rounded-lg border border-border flex items-start gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg shrink-0">
            <Leaf className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[10px] text-foreground-tertiary font-bold uppercase tracking-wider block leading-none">
              Carbon Offset
            </span>
            <p className="text-base font-bold text-foreground mt-1.5">
              {impact.co2TonnesPerYear.toFixed(2)} Tons / Yr
            </p>
            <span className="text-[9px] text-foreground-secondary mt-1 block">
              Equivalent to planting {impact.treesEquivalent} trees
            </span>
          </div>
        </div>

        <div className="bg-background-secondary p-4 rounded-lg border border-border flex items-start gap-3">
          <div className="p-2 bg-primary/10 text-primary-dark rounded-lg shrink-0">
            <PiggyBank className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[10px] text-foreground-tertiary font-bold uppercase tracking-wider block leading-none">
              Monthly Utility Saved
            </span>
            <p className="text-base font-bold text-foreground mt-1.5">
              {formatCurrency(impact.monthlySavings)}
            </p>
            {impact.paybackYears != null ? (
              <span className="text-[9px] text-foreground-secondary mt-1 block">
                Expected payback in ~{impact.paybackYears} years
              </span>
            ) : (
              <span className="text-[9px] text-foreground-secondary mt-1 block">
                25yr savings {formatCurrency(impact.npv25YearRupees)}
              </span>
            )}
          </div>
        </div>

        <div className="bg-background-secondary p-4 rounded-lg border border-border flex items-start gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
            <TrendingUp className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[10px] text-foreground-tertiary font-bold uppercase tracking-wider block leading-none">
              Generation Est.
            </span>
            <p className="text-base font-bold text-foreground mt-1.5">
              {Math.round(impact.monthlyKwh)} kWh / Month
            </p>
            <span className="text-[9px] text-foreground-secondary mt-1 block">
              Average Discom active offset yield
            </span>
          </div>
        </div>
      </div>
    </Paper>
  );
}

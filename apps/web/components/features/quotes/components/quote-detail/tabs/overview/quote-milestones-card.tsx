'use client';

import { Paper } from '@mui/material';
import React from 'react';

import { formatCurrency } from '@/lib/utils/format';

interface Milestone {
  name: string;
  stage: string;
  percentage: number;
  amount?: number | null;
}

interface QuoteMilestonesCardProps {
  milestones: Milestone[];
}

function getMilestoneDescription(stage: string): string {
  const s = stage.toLowerCase();
  if (s === 'advance') return 'To be paid upon order confirmation';
  if (s === 'installation_complete') return 'To be paid upon installation completion';
  if (s === 'commissioning') return 'To be paid after commissioning and net metering';
  return `To be paid at ${stage.replace(/_/g, ' ')} stage`;
}

export function QuoteMilestonesCard({ milestones }: QuoteMilestonesCardProps): React.JSX.Element {
  return (
    <Paper variant="outlined" className="p-5.5 rounded-xl border border-border bg-white shadow-sm">
      <h3 className="text-sm font-bold text-foreground mb-4">💳 Progress Payment Milestones</h3>

      <div className="relative border-l border-border ml-3.5 space-y-5 pt-1">
        {milestones.map((milestone, idx) => (
          <div key={`${milestone.stage}-${idx}`} className="relative pl-6">
            <div
              className={`absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full ${
                idx === 0 ? 'bg-primary ring-4 ring-primary/10' : 'bg-border'
              }`}
            />

            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-semibold text-foreground text-xs leading-none">
                  {milestone.name}
                </h4>
                {milestone.stage && (
                  <span className="text-[10px] text-foreground-tertiary mt-1.5 block leading-none">
                    {getMilestoneDescription(milestone.stage)}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] text-primary-dark bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20 font-medium">
                  {milestone.percentage}% Milestone
                </span>
                <p className="text-xs font-bold text-foreground-secondary mt-1">
                  {formatCurrency(milestone.amount ?? 0)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Paper>
  );
}

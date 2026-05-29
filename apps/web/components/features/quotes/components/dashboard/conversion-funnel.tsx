'use client';

import Card from '@mui/material/Card';
import * as React from 'react';

import { MUITypography } from '@/components/ui';

// ============================================================================
// Types
// ============================================================================

export interface FunnelData {
  draft: number;
  sent: number;
  accepted: number;
  project: number;
  rates: {
    draftToSent: number;
    sentToAccepted: number;
    acceptedToProject: number;
    overall: number;
  };
}

export interface ConversionFunnelProps {
  data: FunnelData;
}

// ============================================================================
// Component
// ============================================================================

export function ConversionFunnel({ data }: ConversionFunnelProps): React.JSX.Element {
  const stages = React.useMemo(
    () => [
      { label: 'Draft', value: data.draft, rate: '100%', color: 'bg-slate-400' },
      { label: 'Sent', value: data.sent, rate: `${data.rates.draftToSent}%`, color: 'bg-sky-400' },
      {
        label: 'Accepted',
        value: data.accepted,
        rate: `${data.rates.sentToAccepted}%`,
        color: 'bg-emerald-500',
      },
      {
        label: 'Project',
        value: data.project,
        rate: `${data.rates.acceptedToProject}%`,
        color: 'bg-indigo-500',
      },
    ],
    [data],
  );

  return (
    <Card
      elevation={0}
      className="lg:w-[30%] p-4 rounded-lg border border-border-light bg-background shadow-card flex flex-col justify-between min-h-[420px]"
    >
      <div>
        <MUITypography variant="sectionTitle" className="font-semibold text-text-primary">
          Conversion Funnel
        </MUITypography>
        <MUITypography variant="finePrint" className="text-text-secondary mt-0.5">
          Stage-to-stage customer win-rates
        </MUITypography>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-4 mt-6">
        {stages.map((item, idx) => {
          const barWidth = 100 - idx * 10;
          return (
            <div key={item.label} className="flex flex-col gap-1 w-full items-center">
              <div
                className={`flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-white rounded-lg ${item.color} shadow-sm transition-all hover:opacity-95`}
                style={{ width: `${barWidth}%` }}
              >
                <span className="truncate">{item.label}</span>
                <span>{item.value}</span>
              </div>
              {idx < 3 && (
                <div className="text-[10px] text-text-secondary font-semibold py-0.5 flex flex-col items-center leading-none">
                  <span>↓</span>
                  <MUITypography
                    variant="finePrint"
                    className="mt-0.5 text-[9px] text-text-secondary"
                  >
                    {
                      [
                        `${data.rates.draftToSent}% conv`,
                        `${data.rates.sentToAccepted}% accept`,
                        `${data.rates.acceptedToProject}% project`,
                      ][idx]
                    }
                  </MUITypography>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t border-border-light flex items-center justify-between text-xs text-text-secondary mt-4">
        <MUITypography variant="body" className="text-text-secondary">
          Overall Yield
        </MUITypography>
        <MUITypography variant="bodyPrimary" className="font-semibold text-indigo-600">
          {data.rates.overall}%
        </MUITypography>
      </div>
    </Card>
  );
}

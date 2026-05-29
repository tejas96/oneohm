'use client';

import * as React from 'react';

import Card from '@mui/material/Card';

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

interface ConversionFunnelProps {
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
      className="lg:w-[30%] p-6 rounded-[20px] border border-slate-200/80 bg-white shadow-sm flex flex-col justify-between min-h-[420px]"
    >
      <div>
        <h2 className="text-base font-semibold text-slate-900">Conversion Funnel</h2>
        <p className="text-xs text-slate-500 mt-0.5">Stage-to-stage customer win-rates</p>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-4 mt-6">
        {stages.map((item, idx) => {
          const barWidth = 100 - idx * 10;
          return (
            <div key={item.label} className="flex flex-col gap-1 w-full items-center">
              <div
                className={`flex items-center justify-between px-4 py-2 text-xs font-semibold text-white rounded-xl ${item.color} shadow-sm transition-all hover:opacity-95`}
                style={{ width: `${barWidth}%` }}
              >
                <span className="truncate">{item.label}</span>
                <span>{item.value}</span>
              </div>
              {idx < 3 && (
                <div className="text-[10px] text-slate-400 font-bold py-0.5 flex flex-col items-center leading-none">
                  <span>↓</span>
                  <span className="mt-0.5 text-[9px] text-slate-500">
                    {
                      [
                        `${data.rates.draftToSent}% conv`,
                        `${data.rates.sentToAccepted}% accept`,
                        `${data.rates.acceptedToProject}% project`,
                      ][idx]
                    }
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Overall Yield</span>
        <span className="font-semibold text-indigo-600">{data.rates.overall}%</span>
      </div>
    </Card>
  );
}

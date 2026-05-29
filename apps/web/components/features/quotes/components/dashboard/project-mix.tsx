'use client';

import Card from '@mui/material/Card';
import * as React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';


// ============================================================================
// Types
// ============================================================================

export interface ProjectMixItem {
  id: string;
  label: string;
  value: number; // percentage
  count: number;
  color: string;
}

interface ProjectMixProps {
  data: ProjectMixItem[];
  totalCount: number;
}

// ============================================================================
// Component
// ============================================================================

export function ProjectMix({ data, totalCount }: ProjectMixProps): React.JSX.Element {
  return (
    <Card
      elevation={0}
      className="flex-1 lg:w-1/2 p-6 rounded-[20px] border border-slate-200/80 bg-white shadow-sm flex flex-col justify-between min-h-[360px]"
    >
      <div>
        <h2 className="text-base font-semibold text-slate-900">Project Mix</h2>
        <p className="text-xs text-slate-500 mt-0.5">Quotation distribution by target category</p>
      </div>

      <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6 mt-6">
        <div className="relative size-[180px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius="65%"
                outerRadius="90%"
                paddingAngle={3}
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: 11,
                }}
                formatter={(v) => [typeof v === 'number' || typeof v === 'string' ? `${v}%` : '', '']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total
            </span>
            <span className="text-2xl font-extrabold text-slate-800 leading-none mt-1">
              {totalCount}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 flex-1 w-full justify-center">
          {data.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between text-xs py-1 border-b border-slate-50"
            >
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                <span className="font-semibold text-slate-600">{entry.label}</span>
              </div>
              <span className="font-bold text-slate-800">{entry.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

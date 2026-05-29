'use client';

import Card from '@mui/material/Card';
import * as React from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';


// ============================================================================
// Types
// ============================================================================

export interface TrendPoint {
  month: string;
  pipeline: number; // in Lakhs
  accepted: number; // in Lakhs
}

interface RevenueTrendProps {
  data: TrendPoint[];
  isLoading?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function RevenueTrend({ data }: RevenueTrendProps): React.JSX.Element {
  return (
    <Card
      elevation={0}
      className="flex-1 lg:w-[70%] p-6 rounded-[20px] border border-slate-200/80 bg-white shadow-sm flex flex-col justify-between min-h-[420px]"
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Revenue Trend</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pipeline valuation and accepted revenue over time
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-blue-500" />
            <span className="text-xs font-medium text-slate-600">Pipeline Value</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-teal-500" />
            <span className="text-xs font-medium text-slate-600">Accepted Revenue</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPipeline" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.06} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorAccepted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.06} />
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₹${v}L`}
              tick={{ fill: '#64748b', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 4px 12px -2px rgba(0,0,0,0.05)',
                fontSize: 12,
              }}
              formatter={(value) => [
                typeof value === 'number' || typeof value === 'string' ? `₹${value}L` : '',
                '',
              ]}
            />
            <Area
              type="monotone"
              dataKey="pipeline"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPipeline)"
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="accepted"
              stroke="#14b8a6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorAccepted)"
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

'use client';

import Card from '@mui/material/Card';
import * as React from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { MUITypography } from '@/components/ui';

// ============================================================================
// Types
// ============================================================================

export interface TrendPoint {
  month: string;
  approved: number;
  completed: number;
}

interface ProgressTrendProps {
  data: TrendPoint[];
}

// ============================================================================
// Component
// ============================================================================

export function ProgressTrend({ data }: ProgressTrendProps): React.JSX.Element {
  return (
    <Card
      elevation={0}
      className="flex-1 lg:w-[65%] p-4 rounded-lg border border-border-light bg-background shadow-card flex flex-col justify-between min-h-[360px]"
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <MUITypography variant="sectionTitle" className="font-semibold text-text-primary">
              Project Delivery Velocity
            </MUITypography>
            <MUITypography variant="finePrint" className="text-text-secondary mt-0.5">
              Newly approved solar contracts vs. completed solar installations
            </MUITypography>
          </div>
          {/* BUG-8 FIX: Clearly label that this is sample/placeholder data */}
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-50 text-slate-500 border border-slate-200">
            Sample Data
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-blue-500" />
            <MUITypography variant="finePrint" className="font-medium text-text-secondary">
              Approved Contracts
            </MUITypography>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-teal-500" />
            <MUITypography variant="finePrint" className="font-medium text-text-secondary">
              Completed Installs
            </MUITypography>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[220px] w-full">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <MUITypography variant="body" className="text-text-secondary italic">
              No trend data available
            </MUITypography>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.06} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.06} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10 }}
                allowDecimals={false}
              />
              {/* BUG-13 FIX: Provide proper series labels in tooltip */}
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px -2px rgba(0,0,0,0.05)',
                  fontSize: 11,
                }}
                formatter={(value, name) => {
                  const label =
                    name === 'approved'
                      ? 'Approved'
                      : name === 'completed'
                        ? 'Completed'
                        : String(name);
                  return [
                    typeof value === 'number' || typeof value === 'string'
                      ? `${value} Projects`
                      : '',
                    label,
                  ];
                }}
              />
              <Area
                type="monotone"
                dataKey="approved"
                name="approved"
                stroke="#3b82f6"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#colorApproved)"
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="completed"
                name="completed"
                stroke="#14b8a6"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#colorCompleted)"
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

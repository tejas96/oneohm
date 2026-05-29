'use client';

import Card from '@mui/material/Card';
import * as React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { MUITypography } from '@/components/ui';

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

export interface ProjectMixProps {
  data: ProjectMixItem[];
  totalCount: number;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ProjectMix({ data, totalCount, className }: ProjectMixProps): React.JSX.Element {
  return (
    <Card
      elevation={0}
      className={`flex-1 p-4 rounded-lg border border-border-light bg-background shadow-card flex flex-col justify-between min-h-[360px] ${
        className || 'lg:w-1/2'
      }`}
    >
      <div>
        <MUITypography variant="sectionTitle" className="font-semibold text-text-primary">
          Project Mix
        </MUITypography>
        <MUITypography variant="finePrint" className="text-text-secondary mt-0.5">
          Quotation distribution by target category
        </MUITypography>
      </div>

      <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6 mt-4">
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
                formatter={(v) => [
                  typeof v === 'number' || typeof v === 'string' ? `${v}%` : '',
                  '',
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <MUITypography
              variant="finePrint"
              className="font-semibold text-text-secondary uppercase tracking-wider"
            >
              Total
            </MUITypography>
            <MUITypography
              variant="drawerTitle"
              className="font-semibold text-text-primary leading-none mt-1"
            >
              {totalCount}
            </MUITypography>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 flex-1 w-full justify-center">
          {data.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between text-xs py-1 border-b border-border-light"
            >
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                <MUITypography variant="body" className="font-semibold text-text-secondary">
                  {entry.label}
                </MUITypography>
              </div>
              <MUITypography variant="bodyPrimary" className="font-semibold text-text-primary">
                {entry.value}%
              </MUITypography>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

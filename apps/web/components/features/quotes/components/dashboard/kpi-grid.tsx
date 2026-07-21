'use client';

import AutoAwesome from '@mui/icons-material/AutoAwesome';
import Business from '@mui/icons-material/Business';
import CheckCircle from '@mui/icons-material/CheckCircle';
import TrendingUp from '@mui/icons-material/TrendingUp';
import Card from '@mui/material/Card';
import * as React from 'react';

import { MUITypography } from '@/components/ui';

// ============================================================================
// Types
// ============================================================================

export interface KPICardData {
  pipeline: string;
  accepted: string;
  winRate: string;
  avgDeal: string;
}

export interface KPICardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ReactNode;
}

// ============================================================================
// Presentational Sub-component
// ============================================================================

function KPICard({ title, value, change, isPositive, icon }: KPICardProps): React.JSX.Element {
  return (
    <Card
      elevation={0}
      className="p-4 rounded-lg shadow-e2 bg-background shadow-card transition-all hover:shadow-sm flex flex-col justify-between min-h-[130px] relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
        {icon}
      </div>
      <div className="flex items-center justify-between">
        <MUITypography variant="body" className="font-medium text-text-secondary">
          {title}
        </MUITypography>
        <div className="text-text-secondary p-1 bg-background-secondary rounded-lg group-hover:bg-border-light transition-colors">
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <MUITypography variant="drawerTitle" className="font-semibold text-text-primary">
          {value}
        </MUITypography>
        <span
          className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            isPositive
              ? 'text-emerald-700 bg-emerald-50 border border-emerald-100'
              : 'text-rose-700 bg-rose-50 border border-rose-100'
          }`}
        >
          {isPositive ? '↑' : '↓'} {change}
        </span>
      </div>
    </Card>
  );
}

// ============================================================================
// Main Export
// ============================================================================

export function KPIGrid({ data }: { data: KPICardData }): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Active Pipeline"
        value={data.pipeline}
        change="12%"
        isPositive={true}
        icon={<TrendingUp className="size-5 text-blue-500" />}
      />
      <KPICard
        title="Accepted Revenue"
        value={data.accepted}
        change="18%"
        isPositive={true}
        icon={<CheckCircle className="size-5 text-emerald-500" />}
      />
      <KPICard
        title="Win Rate"
        value={data.winRate}
        change="↑ 5%"
        isPositive={true}
        icon={<AutoAwesome className="size-5 text-violet-500" />}
      />
      <KPICard
        title="Average Deal"
        value={data.avgDeal}
        change="0%"
        isPositive={true}
        icon={<Business className="size-5 text-amber-500" />}
      />
    </div>
  );
}

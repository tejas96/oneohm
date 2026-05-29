'use client';

import Card from '@mui/material/Card';
import { Building2, CheckCircle2, Sparkles, TrendingUp } from 'lucide-react';
import * as React from 'react';

// ============================================================================
// Types
// ============================================================================

export interface KPICardData {
  pipeline: string;
  accepted: string;
  winRate: string;
  avgDeal: string;
}

interface KPICardProps {
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
      className="p-6 rounded-[20px] border border-slate-200/80 bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.01),0_2px_4px_-1px_rgba(0,0,0,0.005)] transition-all hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[140px] relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        {icon}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <div className="text-slate-400 p-1.5 bg-slate-50 rounded-lg group-hover:bg-slate-100 transition-colors">
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          {value}
        </span>
        <span
          className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
        icon={<CheckCircle2 className="size-5 text-emerald-500" />}
      />
      <KPICard
        title="Win Rate"
        value={data.winRate}
        change="↑ 5%"
        isPositive={true}
        icon={<Sparkles className="size-5 text-violet-500" />}
      />
      <KPICard
        title="Average Deal"
        value={data.avgDeal}
        change="0%"
        isPositive={true}
        icon={<Building2 className="size-5 text-amber-500" />}
      />
    </div>
  );
}

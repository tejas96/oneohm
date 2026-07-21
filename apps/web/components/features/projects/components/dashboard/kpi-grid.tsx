'use client';

import CheckCircle from '@mui/icons-material/CheckCircle';
import People from '@mui/icons-material/People';
import TrendingUp from '@mui/icons-material/TrendingUp';
import Warning from '@mui/icons-material/Warning';
import Card from '@mui/material/Card';
import * as React from 'react';

import { MUITypography } from '@/components/ui';

// ============================================================================
// Types
// ============================================================================

export interface KPICardData {
  activeProjects: number;
  overallHealth: string;
  criticalBlockers: number;
  activeWorkers: number;
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
}

// ============================================================================
// Presentational Sub-component
// ============================================================================

// BUG-4 FIX: Removed hardcoded fake trend percentages (↑ 8%, ↓ 12% etc.).
// Now shows a contextual subtitle instead of misleading trend data.
function KPICard({ title, value, subtitle, icon }: KPICardProps): React.JSX.Element {
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
        <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full text-text-secondary bg-background-secondary">
          {subtitle}
        </span>
      </div>
    </Card>
  );
}

// ============================================================================
// Main Export
// ============================================================================

export function KPIGrid({ data }: { data: KPICardData }): React.JSX.Element {
  // Compute contextual subtitles based on actual data
  const blockerLabel =
    data.criticalBlockers === 0 ? 'All clear' : `${data.criticalBlockers} on hold`;
  const healthLabel = data.overallHealth === '0%' ? 'No projects' : 'Avg progress';
  const workerLabel = data.activeWorkers === 0 ? 'No team data' : 'Team members';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Active Projects"
        value={data.activeProjects}
        subtitle="Across all phases"
        icon={<TrendingUp className="size-5 text-blue-500" />}
      />
      <KPICard
        title="Overall Health"
        value={data.overallHealth}
        subtitle={healthLabel}
        icon={<CheckCircle className="size-5 text-emerald-500" />}
      />
      <KPICard
        title="Critical Blockers"
        value={data.criticalBlockers}
        subtitle={blockerLabel}
        icon={<Warning className="size-5 text-rose-500" />}
      />
      <KPICard
        title="Active Workers"
        value={data.activeWorkers}
        subtitle={workerLabel}
        icon={<People className="size-5 text-violet-500" />}
      />
    </div>
  );
}

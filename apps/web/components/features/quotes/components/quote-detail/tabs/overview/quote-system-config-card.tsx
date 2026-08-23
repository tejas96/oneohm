'use client';

import { Paper } from '@mui/material';
import React from 'react';

import { SYSTEM_TYPE_LABELS, PROJECT_TYPE_LABELS } from '../../../../constants';

import { SystemSizeDisplay } from '@/components/ui/system-size-display';

interface QuoteSystemConfigCardProps {
  kw: number;
  totalWattageWp: number;
  systemType: string;
  projectType: string;
  projectCompletionWeeks?: number | null;
  phaseType?: string | null;
  dcrPreference?: string | null;
  structureType?: string | null;
  dcrSystemSizeKw?: number | null;
  nonDcrSystemSizeKw?: number | null;
  floorNumber?: number | null;
  distanceKm?: number | null;
}

export function QuoteSystemConfigCard({
  kw,
  totalWattageWp,
  systemType,
  projectType,
  projectCompletionWeeks,
  phaseType,
  dcrPreference,
  structureType,
  dcrSystemSizeKw,
  nonDcrSystemSizeKw,
  floorNumber,
  distanceKm,
}: QuoteSystemConfigCardProps): React.JSX.Element {
  const renderItem = (label: string, value: React.ReactNode): React.ReactNode => (
    <div className="bg-background-secondary p-3 rounded-lg border border-border">
      <span className="uppercase font-semibold text-[0.65rem] text-foreground-tertiary block leading-none">
        {label}
      </span>
      <div className="mt-1 text-xs font-bold text-foreground">{value}</div>
    </div>
  );

  return (
    <Paper variant="outlined" className="p-5.5 rounded-xl border border-border bg-white shadow-sm">
      <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-1.5">
        ⚡ System Configuration
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {renderItem('System Size', <SystemSizeDisplay kw={kw} layout="inline" />)}
        {renderItem('Total Wattage', `${totalWattageWp} Wp`)}
        {renderItem(
          'System Type',
          SYSTEM_TYPE_LABELS[systemType as keyof typeof SYSTEM_TYPE_LABELS] ?? systemType,
        )}
        {renderItem('Project Type', PROJECT_TYPE_LABELS[projectType] ?? projectType)}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        {phaseType && renderItem('Phase Type', phaseType.replace(/_/g, ' '))}
        {structureType && renderItem('Structure Type', structureType.replace(/_/g, ' '))}
        {dcrPreference && renderItem('DCR Preference', dcrPreference.replace(/_/g, ' '))}
        {distanceKm != null && renderItem('Distance', `${distanceKm} km`)}
        {dcrSystemSizeKw != null && renderItem('DCR Size', `${dcrSystemSizeKw} kW`)}
        {nonDcrSystemSizeKw != null &&
          nonDcrSystemSizeKw > 0 &&
          renderItem('Non-DCR Size', `${nonDcrSystemSizeKw} kW`)}
        {floorNumber != null && floorNumber > 0 && renderItem('Floor', floorNumber)}
        {projectCompletionWeeks != null &&
          renderItem('Completion', `${projectCompletionWeeks} weeks`)}
      </div>
    </Paper>
  );
}

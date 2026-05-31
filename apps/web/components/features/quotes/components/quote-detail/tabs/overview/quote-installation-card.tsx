'use client';

import { Paper } from '@mui/material';
import React from 'react';

import { formatCurrency } from '@/lib/utils/format';

interface InstallationRecord {
  electricalWork?: number | null;
  fixedMaterial?: number | null;
  variableFloor?: number | null;
  structureCost?: number | null;
  installationLabor?: number | null;
  loadingUnloading?: number | null;
  msedclCharges?: number | null;
  supervision?: number | null;
  transport?: number | null;
  totalBeforeTax?: number | null;
  gstAmount?: number | null;
  gstRate?: number | null;
  totalWithGst?: number | null;
}

interface QuoteInstallationCardProps {
  installationData: InstallationRecord;
}

export function QuoteInstallationCard({
  installationData,
}: QuoteInstallationCardProps): React.JSX.Element {
  const renderRow = (label: string, value?: number | null): React.ReactNode => {
    if (value == null || value <= 0) return null;
    return (
      <div className="flex justify-between items-center text-xs text-foreground-secondary">
        <span>{label}</span>
        <span className="font-medium text-foreground">{formatCurrency(value)}</span>
      </div>
    );
  };

  return (
    <Paper
      variant="outlined"
      className="p-5 rounded-xl border border-border bg-white shadow-sm space-y-4"
    >
      <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex justify-between items-center">
        <span>🛠️ Installation Costs</span>
        <span className="text-[10px] text-foreground-tertiary font-normal">Items excl. GST</span>
      </h3>
      <div className="space-y-2.5">
        {renderRow('Electrical Integration', installationData.electricalWork)}
        {renderRow('Fixed Material Kits', installationData.fixedMaterial)}
        {renderRow('Installation Labor Force', installationData.installationLabor)}
        {renderRow('Loading & Unloading', installationData.loadingUnloading)}
        {renderRow('MSEDCL Integration & Liaising', installationData.msedclCharges)}
        {renderRow('Freight & Transportation', installationData.transport)}
        {renderRow('Supervision', installationData.supervision)}
        {renderRow('Structure Cost', installationData.structureCost)}
        {renderRow('Variable Floor Adjustments', installationData.variableFloor)}

        <div className="h-px bg-border my-2" />

        {installationData.totalBeforeTax != null && (
          <div className="flex justify-between items-center text-xs">
            <span className="text-foreground-tertiary">Total Net (Before Tax)</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(installationData.totalBeforeTax)}
            </span>
          </div>
        )}

        {installationData.gstAmount != null && (
          <div className="flex justify-between items-center text-xs">
            <span className="text-foreground-tertiary">
              Total Tax Liability ({installationData.gstRate ?? 18}% GST)
            </span>
            <span className="font-semibold text-foreground">
              {formatCurrency(installationData.gstAmount)}
            </span>
          </div>
        )}

        {installationData.totalWithGst != null && (
          <div className="bg-background-secondary p-3 rounded-lg border border-border flex justify-between items-center text-xs mt-2.5">
            <span className="font-semibold text-foreground-secondary">Total Installation Cost</span>
            <span className="font-bold text-primary-dark">
              {formatCurrency(installationData.totalWithGst)}
            </span>
          </div>
        )}
      </div>
    </Paper>
  );
}

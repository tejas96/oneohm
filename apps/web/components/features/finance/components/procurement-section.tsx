'use client';

import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { LinearProgress, Skeleton } from '@mui/material';
import { type JSX } from 'react';

import { EmptyState, ErrorState } from '@/components/shared/feedback/empty-state';
import { MUIStatusChip, MUITypography, type StatusChipColor } from '@/components/ui';
import {
  type BomProcurementItem,
  type BomProcurementItemStatus,
  useBomProcurementStatus,
} from '@/lib/hooks/resources';
import { formatCurrency, getErrorMessage } from '@/lib/utils';

interface ProcurementSectionProps {
  projectId: string;
}

const STATUS_COLOR: Record<BomProcurementItemStatus, StatusChipColor> = {
  pending: 'default',
  partial: 'warning',
  procured: 'success',
};

const STATUS_LABEL: Record<BomProcurementItemStatus, string> = {
  pending: 'Pending',
  partial: 'Partial',
  procured: 'Procured',
};

function progressColor(item: BomProcurementItem): 'primary' | 'success' | 'warning' | 'error' {
  if (item.over) return 'error';
  if (item.status === 'procured') return 'success';
  if (item.status === 'partial') return 'warning';
  return 'primary';
}

function progressValue(item: BomProcurementItem): number {
  if (item.targetQty <= 0) return 0;
  return Math.min(100, Math.round((item.spentQty / item.targetQty) * 100));
}

function SummaryCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'success' | 'warning' | 'error';
}): JSX.Element {
  const toneClasses: Record<string, string> = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
  };
  return (
    <div className="rounded-lg border border-border-light bg-background-secondary p-3">
      <MUITypography variant="finePrint" className="text-foreground-secondary block">
        {label}
      </MUITypography>
      <MUITypography variant="bodyPrimary" className={`block mt-0.5 ${toneClasses[tone]}`}>
        {String(value)}
      </MUITypography>
    </div>
  );
}

/**
 * Per-product procurement status for the project's BOM. Shows
 * planned-vs-spent quantity (sourced from expense_product_links) so
 * users can see at a glance which line items still need to be
 * procured, which are over-spent (procurement-guard overrides), and
 * how the total spend is tracking against the BOM target.
 *
 * Rendered as a panel below the existing BOM table so the original
 * BOM workflow (sync, finalize, serials) stays untouched.
 */
export function ProcurementSection({ projectId }: ProcurementSectionProps): JSX.Element {
  const {
    data: procurement,
    isLoading,
    isError,
    error,
    refetch,
  } = useBomProcurementStatus(projectId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton variant="rounded" height={64} />
        <Skeleton variant="rounded" height={192} />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load procurement status"
        description={getErrorMessage(error)}
        onRetry={() => refetch()}
      />
    );
  }

  if (!procurement || procurement.items.length === 0) {
    return (
      <EmptyState
        icon={<Inventory2OutlinedIcon style={{ width: '100%', height: '100%' }} />}
        iconColor="muted"
        title="No procurement data yet"
        description="Procurement status appears once the BOM contains items. Materials expenses you record on the Finance tab will be aggregated here."
      />
    );
  }

  const { items, totals } = procurement;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <MUITypography variant="sectionTitle">Procurement Status</MUITypography>
          <MUITypography variant="finePrint" className="text-foreground-muted block">
            Per-product spend versus BOM target. Updates live as materials expenses are recorded.
          </MUITypography>
        </div>
        {totals.overProcuredProducts > 0 && (
          <MUIStatusChip
            label={`${totals.overProcuredProducts} over target`}
            color="error"
            icon={<WarningAmberIcon sx={{ fontSize: 14 }} />}
          />
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryCard label="Products" value={totals.totalProducts} />
        <SummaryCard label="Pending" value={totals.pending} />
        <SummaryCard label="Partial" value={totals.partial} tone="warning" />
        <SummaryCard label="Procured" value={totals.procured} tone="success" />
        <SummaryCard
          label="Spend"
          value={`${formatCurrency(totals.actualSpend)} / ${formatCurrency(totals.targetSpend)}`}
          tone={totals.actualSpend > totals.targetSpend ? 'error' : 'default'}
        />
      </div>

      <div className="rounded-lg border border-border-light overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-3 py-2">
                <MUITypography variant="finePrint" className="text-foreground-muted uppercase">
                  Product
                </MUITypography>
              </th>
              {(['Target', 'Spent', 'Remaining'] as const).map((l) => (
                <th key={l} className="text-right px-3 py-2">
                  <MUITypography variant="finePrint" className="text-foreground-muted uppercase">
                    {l}
                  </MUITypography>
                </th>
              ))}
              <th className="text-left px-3 py-2 w-[200px]">
                <MUITypography variant="finePrint" className="text-foreground-muted uppercase">
                  Progress
                </MUITypography>
              </th>
              <th className="text-right px-3 py-2">
                <MUITypography variant="finePrint" className="text-foreground-muted uppercase">
                  Spend
                </MUITypography>
              </th>
              <th className="text-left px-3 py-2">
                <MUITypography variant="finePrint" className="text-foreground-muted uppercase">
                  Status
                </MUITypography>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {items.map((item) => {
              const value = progressValue(item);
              const color = progressColor(item);
              return (
                <tr key={item.productId} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5">
                    <MUITypography variant="bodyPrimary">{item.name}</MUITypography>
                  </td>
                  <td className="text-right px-3 py-2.5">
                    <MUITypography variant="body">
                      {item.targetQty}
                      {item.unit ? ` ${item.unit}` : ''}
                    </MUITypography>
                  </td>
                  <td className="text-right px-3 py-2.5">
                    <MUITypography variant="body">
                      {item.spentQty}
                      {item.unit ? ` ${item.unit}` : ''}
                    </MUITypography>
                  </td>
                  <td className="text-right px-3 py-2.5">
                    <MUITypography variant="body">
                      {item.remaining}
                      {item.unit ? ` ${item.unit}` : ''}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <LinearProgress
                        variant="determinate"
                        value={value}
                        color={color}
                        sx={{ flex: 1, height: 6, borderRadius: 1 }}
                      />
                      <MUITypography
                        variant="finePrint"
                        className="text-foreground-muted font-mono w-10 text-right"
                      >
                        {value}%
                      </MUITypography>
                    </div>
                  </td>
                  <td className="text-right px-3 py-2.5">
                    <MUITypography variant="body" className="font-mono">
                      {formatCurrency(item.actualSpend)}
                      {item.targetSpend != null && (
                        <span className="text-foreground-muted">
                          {' / '}
                          {formatCurrency(item.targetSpend)}
                        </span>
                      )}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1 flex-wrap">
                      <MUIStatusChip
                        label={STATUS_LABEL[item.status] ?? item.status}
                        color={STATUS_COLOR[item.status] ?? 'default'}
                        colorSeed={item.status}
                      />
                      {item.over && <MUIStatusChip label="Over" color="error" />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <MUITypography variant="finePrint" className="text-foreground-muted flex items-center gap-1">
        <ShoppingBagOutlinedIcon sx={{ fontSize: 12 }} />
        Spent quantities are aggregated from expense line items linked to BOM products via the
        Finance tab.
      </MUITypography>
    </div>
  );
}

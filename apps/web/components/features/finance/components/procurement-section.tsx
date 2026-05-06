'use client';

import { Boxes, ShoppingBag, AlertTriangle } from 'lucide-react';
import { type JSX } from 'react';

import { EmptyState, ErrorState } from '@/components/shared/feedback/empty-state';
import { Badge, Progress, Skeleton } from '@/components/ui';
import {
  type BomProcurementItem,
  type BomProcurementItemStatus,
  useBomProcurementStatus,
} from '@/lib/hooks/resources';
import { formatCurrency, getErrorMessage } from '@/lib/utils';

interface ProcurementSectionProps {
  projectId: string;
}

const STATUS_BADGE: Record<BomProcurementItemStatus, string> = {
  pending: 'secondary',
  partial: 'amber',
  procured: 'green-subtle',
};

const STATUS_LABEL: Record<BomProcurementItemStatus, string> = {
  pending: 'Pending',
  partial: 'Partial',
  procured: 'Procured',
};

function progressVariant(item: BomProcurementItem): 'primary' | 'success' | 'warning' | 'error' {
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
      <p className="text-2xs text-foreground-secondary">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${toneClasses[tone]}`}>{String(value)}</p>
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
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
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
        icon={<Boxes className="w-full h-full" />}
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
          <h3 className="text-sm font-semibold text-foreground">Procurement Status</h3>
          <p className="text-2xs text-foreground-muted">
            Per-product spend versus BOM target. Updates live as materials expenses are recorded.
          </p>
        </div>
        {totals.overProcuredProducts > 0 && (
          <Badge variant="error" size="xs">
            <AlertTriangle className="size-3 mr-1 inline" />
            {totals.overProcuredProducts} over target
          </Badge>
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
              <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2">
                Product
              </th>
              <th className="text-2xs font-medium text-foreground-muted uppercase text-right px-3 py-2">
                Target
              </th>
              <th className="text-2xs font-medium text-foreground-muted uppercase text-right px-3 py-2">
                Spent
              </th>
              <th className="text-2xs font-medium text-foreground-muted uppercase text-right px-3 py-2">
                Remaining
              </th>
              <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2 w-[200px]">
                Progress
              </th>
              <th className="text-2xs font-medium text-foreground-muted uppercase text-right px-3 py-2">
                Spend
              </th>
              <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {items.map((item) => {
              const value = progressValue(item);
              const variant = progressVariant(item);
              return (
                <tr key={item.productId} className="hover:bg-muted/30 transition-colors">
                  <td className="text-xs text-foreground font-medium px-3 py-2.5">{item.name}</td>
                  <td className="text-xs text-foreground text-right px-3 py-2.5">
                    {item.targetQty}
                    {item.unit ? ` ${item.unit}` : ''}
                  </td>
                  <td className="text-xs text-foreground text-right px-3 py-2.5">
                    {item.spentQty}
                    {item.unit ? ` ${item.unit}` : ''}
                  </td>
                  <td className="text-xs text-foreground text-right px-3 py-2.5">
                    {item.remaining}
                    {item.unit ? ` ${item.unit}` : ''}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Progress value={value} variant={variant} />
                      <span className="text-2xs text-foreground-muted font-mono w-10 text-right">
                        {value}%
                      </span>
                    </div>
                  </td>
                  <td className="text-xs text-foreground text-right px-3 py-2.5 font-mono">
                    {formatCurrency(item.actualSpend)}
                    {item.targetSpend != null && (
                      <span className="text-foreground-muted">
                        {' / '}
                        {formatCurrency(item.targetSpend)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant={(STATUS_BADGE[item.status] ?? 'secondary') as 'success'} size="xs">
                      {STATUS_LABEL[item.status] ?? item.status}
                    </Badge>
                    {item.over && (
                      <Badge variant="error" size="xs" className="ml-1">
                        Over
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-2xs text-foreground-muted flex items-center gap-1">
        <ShoppingBag className="size-3" />
        Spent quantities are aggregated from expense line items linked to BOM products via the
        Finance tab.
      </p>
    </div>
  );
}

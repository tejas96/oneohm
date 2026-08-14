'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';

import { StockAdjustDialog } from './stock/stock-adjust-dialog';
import { StockDetailHeader } from './stock/stock-detail-header';
import { StockSettingsDialog } from './stock/stock-settings-dialog';
import { StockTransactionsCard } from './stock/stock-transactions-card';
import { StockTransferDialog } from './stock/stock-transfer-dialog';

import { ErrorState } from '@/components/shared/feedback';
import { ProgressBarCell } from '@/components/shared/inventory/progress-bar-cell';
import { MUITypography } from '@/components/ui/mui-typography';
import { Skeleton } from '@/components/ui/skeleton';
import { useInventoryStockDetail } from '@/lib/hooks/resources/inventory-stock';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

/**
 * Inventory Stock detail page (Part: rebuild-stock-pages).
 *
 * Sections:
 *   1. Sticky StockDetailHeader (back, title, status, actions).
 *   2. Quantity tiles (Available / Reserved / In transit / Min level)
 *      with a progress bar showing buffer-vs-minimum so operators can
 *      eyeball headroom at a glance.
 *   3. Recent transactions card scoped to this product+warehouse pair.
 *   4. Adjust + Transfer dialogs (controlled here so the buttons in
 *      the sticky header can trigger them without prop-drilling).
 *
 * Cross-page concerns:
 *   - Adjust + transfer permissions read from useAuth.hasPermission;
 *     admins bypass via the auth-store fix.
 *   - All mutations go through the FDAL hooks which already invalidate
 *     `inventory-stock` + `inventory-transactions` caches, so the
 *     transactions card refreshes automatically after an adjust.
 */
export function InventoryStockDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { data: stock, isLoading, isError } = useInventoryStockDetail(id);
  const { hasPermission } = useAuth();

  const canAdjust =
    hasPermission('inventory.stock.manage') || hasPermission('inventory.stock.manage');
  const canTransfer =
    hasPermission('inventory.stock.manage') || hasPermission('inventory.stock.manage');
  const canEditSettings = hasPermission('inventory.stock.manage');

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (isError) {
    return <ErrorState title="Failed to load stock" description="Unable to load stock details." />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-10 w-1/2" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!stock) return <ErrorState title="Not found" description="Stock record not found." />;

  const available = Number(stock.availableQuantity ?? 0);
  const reserved = Number(stock.reservedQuantity ?? 0);
  const inTransit = Number(stock.inTransitQuantity ?? 0);
  const min = Number(stock.minimumStockLevel ?? 0);
  const max = Number(stock.maximumStockLevel ?? 0);
  const isLow = min > 0 && available <= min;

  const tiles: ReadonlyArray<{
    label: string;
    value: number | string;
    secondary?: string;
    color: string;
  }> = [
    {
      label: 'Available',
      value: available,
      secondary: stock.product?.unit ?? '',
      color: isLow ? 'text-warning' : 'text-success',
    },
    {
      label: 'Reserved',
      value: reserved,
      secondary: 'allocated, not yet dispatched',
      color: 'text-foreground',
    },
    {
      label: 'In transit',
      value: inTransit,
      secondary: 'inbound or moving',
      color: 'text-info',
    },
    {
      label: 'Min / Max',
      value: `${min || '—'}${max ? ` / ${max}` : ''}`,
      secondary: 'thresholds',
      color: 'text-foreground-secondary',
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <StockDetailHeader
        stock={stock}
        isLow={isLow}
        canAdjust={canAdjust}
        canTransfer={canTransfer}
        canEditSettings={canEditSettings}
        onAdjust={() => setAdjustOpen(true)}
        onTransfer={() => setTransferOpen(true)}
        onSettings={() => setSettingsOpen(true)}
      />

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {tiles.map(({ label, value, secondary, color }) => {
          const isThresholdTile = label === 'Min / Max';
          const noThresholdSet = isThresholdTile && value === '—';

          return (
            <div
              key={label}
              className={cn(
                'flex flex-col gap-1 rounded-xl shadow-e2 bg-white p-4',
                noThresholdSet && canEditSettings && 'cursor-pointer hover:border-primary',
              )}
              onClick={noThresholdSet && canEditSettings ? () => setSettingsOpen(true) : undefined}
              role={noThresholdSet && canEditSettings ? 'button' : undefined}
              tabIndex={noThresholdSet && canEditSettings ? 0 : undefined}
              onKeyDown={
                noThresholdSet && canEditSettings
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSettingsOpen(true);
                      }
                    }
                  : undefined
              }
            >
              <MUITypography
                variant="body"
                className="text-xs uppercase tracking-wide text-foreground-tertiary"
              >
                {label}
              </MUITypography>
              <p className={cn('text-2xl font-semibold tabular-nums', color)}>{value}</p>
              {secondary ? (
                <p className="text-xs text-foreground-tertiary">
                  {noThresholdSet && canEditSettings ? 'Click to set' : secondary}
                </p>
              ) : null}
            </div>
          );
        })}
      </section>

      {min > 0 || max > 0 ? (
        <section className="flex flex-col gap-2 rounded-xl shadow-e2 bg-white p-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              {min > 0 ? 'Buffer vs minimum' : 'Stock utilization'}
            </h3>
            <span className="text-xs text-foreground-tertiary">
              {min > 0 ? `${available} of min ${min}` : `${available} units`}
              {max ? ` (max ${max})` : ''}
            </span>
          </div>
          <ProgressBarCell
            numerator={available}
            denominator={max > 0 ? max : Math.max(min * 2, available)}
            label={max > 0 ? `${available} / max ${max}` : `${available} / min ${min}`}
            intent={isLow ? 'danger' : available <= min * 1.5 ? 'warning' : 'success'}
          />
          <p className="text-xs text-foreground-tertiary">
            {min > 0
              ? isLow
                ? 'Available quantity is at or below the minimum threshold — consider raising a Purchase Order.'
                : available <= min * 1.5
                  ? 'Available is within 50% of the minimum threshold.'
                  : 'Healthy buffer above the minimum threshold.'
              : 'Stock level monitored against maximum capacity.'}
          </p>
        </section>
      ) : null}

      <StockTransactionsCard
        productId={stock.productId}
        warehouseId={stock.warehouseId}
        unit={stock.product?.unit}
      />

      <StockAdjustDialog open={adjustOpen} onOpenChange={setAdjustOpen} stock={stock} />
      <StockTransferDialog open={transferOpen} onOpenChange={setTransferOpen} stock={stock} />
      <StockSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} stock={stock} />
    </div>
  );
}

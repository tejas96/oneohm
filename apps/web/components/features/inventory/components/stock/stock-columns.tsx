'use client';

import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import * as React from 'react';

import type { ColumnConfig } from '@/components/shared/advanced-table';
import { ProgressBarCell } from '@/components/shared/inventory/progress-bar-cell';
import { RowActionMenu, type RowAction } from '@/components/shared/inventory/row-action-menu';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { ROUTES } from '@/lib/config/routes';
import type { InventoryStock } from '@/lib/hooks/resources/inventory-stock';
import { cn } from '@/lib/utils';

/**
 * Column definitions for the inventory stock list.
 *
 * Why a factory (`buildStockColumns`) rather than a static const:
 * the actions column needs callbacks bound to the parent's state
 * (open the adjust dialog, transfer dialog, navigate). Inlining the
 * column array in the parent would push the file over the 500-line
 * cap; pulling it out keeps the parent focused on orchestration.
 */

export interface StockRowActionCallbacks {
  onView: (row: InventoryStock) => void;
  onAdjust: (row: InventoryStock) => void;
  onTransfer: (row: InventoryStock) => void;
  /**
   * Permission-derived flags. The parent computes these once via
   * useAuth().hasPermission and forwards them so we don't pay the
   * cost on every row render.
   */
  canAdjust: boolean;
  canTransfer: boolean;
}

function isLowStock(row: InventoryStock): boolean {
  const avail = Number(row.availableQuantity ?? 0);
  const min = Number(row.minimumStockLevel ?? 0);
  return min > 0 && avail <= min;
}

export type StockColumnRow = InventoryStock & Record<string, unknown>;

export function buildStockColumns(
  callbacks: StockRowActionCallbacks,
): ColumnConfig<StockColumnRow>[] {
  return [
    {
      field: 'product.name',
      headerName: 'Product',
      flex: 2,
      sortable: true,
      renderCell: ({ row }) => (
        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-sm font-medium text-foreground">{row.product?.name ?? '—'}</span>
          <span className="text-xs text-foreground-tertiary">{row.product?.code ?? ''}</span>
        </div>
      ),
    },
    {
      field: 'warehouse.name',
      headerName: 'Warehouse',
      flex: 1,
      renderCell: ({ row }) => (
        <span className="text-sm text-foreground">{row.warehouse?.name ?? '—'}</span>
      ),
    },
    {
      field: 'availableQuantity',
      headerName: 'Available',
      width: 130,
      sortable: true,
      cellSx: { textAlign: 'right' },
      renderCell: ({ row }) => {
        const low = isLowStock(row);
        return (
          <div
            className={cn(
              'flex items-center justify-end gap-1 text-sm font-medium tabular-nums',
              low ? 'text-warning' : 'text-foreground',
            )}
          >
            {low && <WarningAmberIcon sx={{ fontSize: 14 }} />}
            <span>
              {Number(row.availableQuantity ?? 0)} {row.product?.unit ?? ''}
            </span>
          </div>
        );
      },
    },
    {
      field: 'reservedQuantity',
      headerName: 'Reserved',
      width: 110,
      cellSx: { textAlign: 'right' },
      renderCell: ({ row }) => (
        <span className="block text-right text-sm tabular-nums text-foreground-secondary">
          {Number(row.reservedQuantity ?? 0)}
        </span>
      ),
    },
    {
      field: 'inTransitQuantity',
      headerName: 'In transit',
      width: 110,
      cellSx: { textAlign: 'right' },
      renderCell: ({ row }) => (
        <span className="block text-right text-sm tabular-nums text-foreground-secondary">
          {Number(row.inTransitQuantity ?? 0)}
        </span>
      ),
    },
    {
      field: 'stockLevel',
      headerName: 'vs Min level',
      width: 180,
      sortable: false,
      renderCell: ({ row }) => {
        const avail = Number(row.availableQuantity ?? 0);
        const min = Number(row.minimumStockLevel ?? 0);
        if (min <= 0) {
          return <span className="text-xs text-foreground-tertiary">No threshold set</span>;
        }
        // Show buffer above the minimum as a positive bar capped at 200%
        // of the minimum so a small min isn't misleading. Inverted intent
        // means low fill = bad.
        const denom = Math.max(min * 2, avail);
        return (
          <ProgressBarCell
            numerator={Math.min(avail, denom)}
            denominator={denom}
            label={`${avail} / min ${min}`}
            intent={avail <= min ? 'danger' : avail <= min * 1.5 ? 'warning' : 'success'}
          />
        );
      },
    },
    {
      field: 'stockStatus',
      headerName: 'Status',
      width: 120,
      renderCell: ({ row }) => {
        const low = isLowStock(row);
        return (
          <MUIStatusChip
            label={low ? 'Low Stock' : 'In Stock'}
            color={low ? 'warning' : 'success'}
          />
        );
      },
    },
    {
      field: '__actions',
      headerName: '',
      width: 56,
      sortable: false,
      renderCell: ({ row }) => {
        const actions: RowAction[] = [
          {
            id: 'view',
            label: 'View detail',
            icon: <VisibilityOutlinedIcon sx={{ fontSize: 16 }} />,
            onSelect: () => callbacks.onView(row),
          },
          {
            id: 'open',
            label: 'Open in new tab',
            icon: <OpenInNewRoundedIcon sx={{ fontSize: 16 }} />,
            onSelect: () => {
              const href = ROUTES.INVENTORY.STOCK_DETAIL.replace('[id]', row.id);
              window.open(href, '_blank', 'noopener');
            },
          },
          {
            id: 'adjust',
            label: 'Adjust quantity',
            icon: <EditOutlinedIcon sx={{ fontSize: 16 }} />,
            onSelect: () => callbacks.onAdjust(row),
            disabled: !callbacks.canAdjust,
            tooltip: callbacks.canAdjust
              ? undefined
              : 'You need stock:adjust to change quantities.',
          },
          {
            id: 'transfer',
            label: 'Transfer to…',
            icon: <SwapHorizRoundedIcon sx={{ fontSize: 16 }} />,
            onSelect: () => callbacks.onTransfer(row),
            disabled: !callbacks.canTransfer || Number(row.availableQuantity ?? 0) <= 0,
            tooltip: !callbacks.canTransfer
              ? 'You need stock:transfer to move stock between warehouses.'
              : Number(row.availableQuantity ?? 0) <= 0
                ? 'Nothing to transfer — available quantity is zero.'
                : undefined,
          },
        ];
        return (
          <div className="flex justify-center">
            <RowActionMenu
              actions={actions}
              ariaLabel={`Actions for ${row.product?.name ?? row.id}`}
            />
          </div>
        );
      },
    },
  ];
}

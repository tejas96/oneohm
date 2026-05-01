'use client';

import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import * as React from 'react';

import { WAREHOUSE_TYPE_LABEL } from '../../constants';

import type { ColumnConfig } from '@/components/shared/advanced-table';
import { ProgressBarCell } from '@/components/shared/inventory/progress-bar-cell';
import { RowActionMenu, type RowAction } from '@/components/shared/inventory/row-action-menu';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { ROUTES } from '@/lib/config/routes';
import type { StockSummaryByWarehouseRow } from '@/lib/hooks/resources/inventory-stock';
import type { Warehouse } from '@/lib/hooks/resources/warehouses';

/**
 * Why a factory: the actions column needs callbacks bound to parent
 * state (open the edit dialog, navigate). The "SKU rows" column needs
 * the per-warehouse stock summary indexed by warehouseId so we can
 * render utilization without an extra fetch per row. Mirrors the
 * pattern used in `stock-columns.tsx`.
 */

export interface WarehouseRowActionCallbacks {
  onView: (row: Warehouse) => void;
  onEdit: (row: Warehouse) => void;
  canEdit: boolean;
}

export type WarehouseColumnRow = Warehouse & Record<string, unknown>;

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

const STATUS_COLOR: Record<string, 'success' | 'default' | 'warning'> = {
  active: 'success',
  inactive: 'default',
};

export function buildWarehouseColumns(
  callbacks: WarehouseRowActionCallbacks,
  stockByWarehouseId: Map<string, StockSummaryByWarehouseRow>,
  /** Max SKU count across the visible rows — used to scale the bar so
   * the busiest warehouse fills the column. Avoids a misleading
   * 1-row-of-100 looking the same as 1-row-of-1. */
  maxSkuRows: number,
): ColumnConfig<WarehouseColumnRow>[] {
  const denom = Math.max(maxSkuRows, 1);
  return [
    {
      field: 'name',
      headerName: 'Warehouse',
      flex: 2,
      sortable: true,
      renderCell: ({ row }) => (
        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-sm font-medium text-foreground">{row.name}</span>
          <span className="text-xs text-foreground-tertiary">{row.code}</span>
        </div>
      ),
    },
    {
      field: 'warehouseType',
      headerName: 'Type',
      width: 110,
      renderCell: ({ row }) => (
        <span className="text-sm text-foreground capitalize">
          {WAREHOUSE_TYPE_LABEL[row.warehouseType] ?? row.warehouseType}
        </span>
      ),
    },
    {
      field: 'location',
      headerName: 'Location',
      flex: 1,
      sortable: false,
      renderCell: ({ row }) => {
        const location = [row.city, row.state, row.country].filter(Boolean).join(', ');
        return (
          <span className="text-sm text-foreground-secondary">{location || '—'}</span>
        );
      },
    },
    {
      field: 'contactPerson',
      headerName: 'Contact',
      flex: 1,
      renderCell: ({ row }) => (
        <span className="text-sm text-foreground-secondary">
          {row.contactPerson ?? '—'}
        </span>
      ),
    },
    {
      field: 'skuRows',
      headerName: 'SKU rows',
      width: 170,
      sortable: false,
      renderCell: ({ row }) => {
        const summary = stockByWarehouseId.get(row.id);
        const items = Number(summary?.totalItems ?? 0);
        if (items === 0) {
          return (
            <span className="text-xs text-foreground-tertiary">No stock yet</span>
          );
        }
        return (
          <ProgressBarCell
            numerator={items}
            denominator={denom}
            label={`${items} SKU${items === 1 ? '' : 's'}`}
            intent="info"
          />
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: ({ row }) => (
        <MUIStatusChip
          label={STATUS_LABEL[row.status] ?? row.status}
          color={STATUS_COLOR[row.status] ?? 'default'}
        />
      ),
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
              const href = ROUTES.INVENTORY.WAREHOUSE_DETAIL.replace('[id]', row.id);
              window.open(href, '_blank', 'noopener');
            },
          },
          {
            id: 'edit',
            label: 'Edit warehouse',
            icon: <EditOutlinedIcon sx={{ fontSize: 16 }} />,
            onSelect: () => callbacks.onEdit(row),
            disabled: !callbacks.canEdit,
            tooltip: callbacks.canEdit
              ? undefined
              : 'You need inventory:write to edit warehouses.',
          },
        ];
        return (
          <div className="flex justify-center">
            <RowActionMenu actions={actions} ariaLabel={`Actions for ${row.name}`} />
          </div>
        );
      },
    },
  ];
}

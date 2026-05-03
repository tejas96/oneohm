'use client';

import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import * as React from 'react';

import { ALLOCATION_STATUS_COLOR, ALLOCATION_STATUS_LABEL } from '../../constants';

import type { ColumnConfig } from '@/components/shared/advanced-table';
import { ProgressBarCell } from '@/components/shared/inventory/progress-bar-cell';
import { RowActionMenu, type RowAction } from '@/components/shared/inventory/row-action-menu';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { ROUTES } from '@/lib/config/routes';
import type { StockAllocation } from '@/lib/hooks/resources/stock-allocations';

export interface AllocationRowActionCallbacks {
  onView: (row: StockAllocation) => void;
  onFulfill: (row: StockAllocation) => void;
  onCancel: (row: StockAllocation) => void;
  canWrite: boolean;
}

export type AllocationColumnRow = StockAllocation & Record<string, unknown>;

export function buildAllocationColumns(
  callbacks: AllocationRowActionCallbacks,
): ColumnConfig<AllocationColumnRow>[] {
  return [
    {
      field: 'product.name',
      headerName: 'Product',
      flex: 2,
      sortable: false,
      renderCell: ({ row }) => (
        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-sm font-medium text-foreground">{row.product?.name ?? '—'}</span>
          <span className="text-xs text-foreground-tertiary">{row.product?.code ?? ''}</span>
        </div>
      ),
    },
    {
      field: 'project.name',
      headerName: 'Project',
      flex: 1,
      sortable: false,
      renderCell: ({ row }) => (
        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-sm text-foreground">{row.project?.name ?? '—'}</span>
          {row.project?.projectNumber ? (
            <span className="text-xs text-foreground-tertiary">{row.project.projectNumber}</span>
          ) : null}
        </div>
      ),
    },
    {
      field: 'warehouse.name',
      headerName: 'Warehouse',
      flex: 1,
      sortable: false,
      renderCell: ({ row }) => (
        <span className="text-sm text-foreground-secondary">{row.warehouse?.name ?? '—'}</span>
      ),
    },
    {
      field: 'allocatedQuantity',
      headerName: 'Allocated',
      width: 100,
      sortable: true,
      renderCell: ({ row }) => (
        <span className="block text-right text-sm font-medium tabular-nums text-foreground">
          {Number(row.allocatedQuantity)}
        </span>
      ),
    },
    {
      field: 'fulfillProgress',
      headerName: 'Dispatched',
      width: 170,
      sortable: false,
      renderCell: ({ row }) => {
        const allocated = Number(row.allocatedQuantity ?? 0);
        const dispatched = Number(row.dispatchedQuantity ?? 0);
        if (allocated <= 0) {
          return <span className="text-xs text-foreground-tertiary">—</span>;
        }
        const intent: 'success' | 'info' = dispatched >= allocated ? 'success' : 'info';
        return (
          <ProgressBarCell
            numerator={dispatched}
            denominator={allocated}
            label={`${dispatched} / ${allocated}`}
            intent={intent}
          />
        );
      },
    },
    {
      field: 'returnedQuantity',
      headerName: 'Returned',
      width: 100,
      sortable: false,
      renderCell: ({ row }) => {
        const returned = Number(row.returnedQuantity ?? 0);
        return (
          <span
            className={`block text-right text-sm tabular-nums ${
              returned > 0 ? 'text-warning' : 'text-foreground-tertiary'
            }`}
          >
            {returned > 0 ? returned : '—'}
          </span>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 160,
      renderCell: ({ row }) => (
        <MUIStatusChip
          label={ALLOCATION_STATUS_LABEL[row.status] ?? row.status}
          color={ALLOCATION_STATUS_COLOR[row.status] ?? 'default'}
        />
      ),
    },
    {
      field: '__actions',
      headerName: '',
      width: 56,
      sortable: false,
      renderCell: ({ row }) => {
        const remaining = Number(row.allocatedQuantity ?? 0) - Number(row.dispatchedQuantity ?? 0);
        const canFulfillThis = callbacks.canWrite && row.status !== 'cancelled' && remaining > 0;
        const canCancelThis =
          callbacks.canWrite &&
          row.status !== 'cancelled' &&
          row.status !== 'dispatched' &&
          row.status !== 'completed';
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
              const href = ROUTES.INVENTORY.ALLOCATION_DETAIL.replace('[id]', row.id);
              window.open(href, '_blank', 'noopener');
            },
          },
          {
            id: 'fulfill',
            label: 'Fulfill',
            icon: <LocalShippingOutlinedIcon sx={{ fontSize: 16 }} />,
            onSelect: () => callbacks.onFulfill(row),
            disabled: !canFulfillThis,
            tooltip: !callbacks.canWrite
              ? 'You need allocation:write to fulfill allocations.'
              : remaining <= 0
                ? 'Nothing left to fulfill.'
                : row.status === 'cancelled'
                  ? 'Allocation is cancelled.'
                  : undefined,
          },
          {
            id: 'cancel',
            label: 'Cancel',
            icon: <CancelOutlinedIcon sx={{ fontSize: 16 }} />,
            onSelect: () => callbacks.onCancel(row),
            disabled: !canCancelThis,
            tooltip: !callbacks.canWrite
              ? 'You need allocation:write to cancel allocations.'
              : row.status === 'cancelled'
                ? 'Already cancelled.'
                : row.status === 'dispatched' || row.status === 'completed'
                  ? 'Dispatched/completed allocations cannot be cancelled.'
                  : undefined,
          },
        ];
        return (
          <div className="flex justify-center">
            <RowActionMenu
              actions={actions}
              ariaLabel={`Actions for allocation ${row.id.slice(0, 8)}`}
            />
          </div>
        );
      },
    },
  ];
}

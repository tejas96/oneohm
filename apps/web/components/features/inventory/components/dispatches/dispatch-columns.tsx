'use client';

import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import * as React from 'react';

import { DISPATCH_STATUS_COLOR, DISPATCH_STATUS_LABEL } from '../../constants';

import type { ColumnConfig } from '@/components/shared/advanced-table';
import { RowActionMenu, type RowAction } from '@/components/shared/inventory/row-action-menu';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { ROUTES } from '@/lib/config/routes';
import type { MaterialDispatch } from '@/lib/hooks/resources/material-dispatches';
import { formatDate } from '@/lib/utils';

export interface DispatchRowCallbacks {
  onView: (row: MaterialDispatch) => void;
  onMarkDispatched: (row: MaterialDispatch) => void;
  onMarkDelivered: (row: MaterialDispatch) => void;
  onCancel: (row: MaterialDispatch) => void;
  canWrite: boolean;
}

export type DispatchColumnRow = MaterialDispatch & Record<string, unknown>;

export function buildDispatchColumns(
  callbacks: DispatchRowCallbacks,
): ColumnConfig<DispatchColumnRow>[] {
  return [
    {
      field: 'dispatchNumber',
      headerName: 'Dispatch #',
      flex: 1,
      sortable: true,
      renderCell: ({ row }) => (
        <span className="text-sm font-medium text-primary">{row.dispatchNumber}</span>
      ),
    },
    {
      field: 'project.name',
      headerName: 'Project',
      flex: 1.5,
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
      headerName: 'From warehouse',
      flex: 1,
      sortable: false,
      renderCell: ({ row }) => (
        <span className="text-sm text-foreground-secondary">
          {row.warehouse?.name ?? '—'}
        </span>
      ),
    },
    {
      field: 'dispatchDate',
      headerName: 'Dispatched',
      width: 130,
      sortable: true,
      renderCell: ({ row }) => (
        <span className="text-sm text-foreground-secondary tabular-nums">
          {row.dispatchDate ? formatDate(row.dispatchDate as string) : '—'}
        </span>
      ),
    },
    {
      field: 'expectedDeliveryDate',
      headerName: 'Expected',
      width: 130,
      renderCell: ({ row }) => {
        const exp = row.expectedDeliveryDate;
        if (!exp) return <span className="text-xs text-foreground-tertiary">—</span>;
        const isOverdue =
          new Date(exp).getTime() < Date.now() &&
          row.status !== 'delivered' &&
          row.status !== 'cancelled';
        return (
          <span
            className={
              `text-sm tabular-nums ${ 
              isOverdue ? 'font-medium text-error' : 'text-foreground-secondary'}`
            }
            title={isOverdue ? 'Overdue' : undefined}
          >
            {formatDate(exp as string)}
          </span>
        );
      },
    },
    {
      field: 'vehicleNumber',
      headerName: 'Vehicle',
      width: 130,
      sortable: false,
      renderCell: ({ row }) => (
        <span className="text-sm text-foreground-secondary">
          {row.vehicleNumber ?? '—'}
        </span>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: ({ row }) => (
        <MUIStatusChip
          label={DISPATCH_STATUS_LABEL[row.status as string] ?? row.status}
          color={DISPATCH_STATUS_COLOR[row.status as string] ?? 'default'}
        />
      ),
    },
    {
      field: '__actions',
      headerName: '',
      width: 56,
      sortable: false,
      renderCell: ({ row }) => {
        const canDispatch =
          callbacks.canWrite && (row.status === 'prepared' || row.status === 'pending');
        const canDeliver =
          callbacks.canWrite && (row.status === 'dispatched' || row.status === 'in_transit');
        const canCancelThis =
          callbacks.canWrite && row.status !== 'delivered' && row.status !== 'cancelled';
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
              window.open(`${ROUTES.INVENTORY.DISPATCHES}/${row.id}`, '_blank', 'noopener');
            },
          },
          {
            id: 'mark-dispatched',
            label: 'Mark dispatched',
            icon: <LocalShippingOutlinedIcon sx={{ fontSize: 16 }} />,
            onSelect: () => callbacks.onMarkDispatched(row),
            disabled: !canDispatch,
            tooltip: !callbacks.canWrite
              ? 'You need dispatch:write to update dispatches.'
              : !canDispatch
              ? 'Only PREPARED dispatches can be marked dispatched.'
              : undefined,
          },
          {
            id: 'mark-delivered',
            label: 'Mark delivered',
            icon: <CheckCircleOutlineRoundedIcon sx={{ fontSize: 16 }} />,
            onSelect: () => callbacks.onMarkDelivered(row),
            disabled: !canDeliver,
            tooltip: !callbacks.canWrite
              ? 'You need dispatch:write to update dispatches.'
              : !canDeliver
              ? 'Only dispatched / in-transit dispatches can be marked delivered.'
              : undefined,
          },
          {
            id: 'cancel',
            label: 'Cancel',
            icon: <CancelOutlinedIcon sx={{ fontSize: 16 }} />,
            onSelect: () => callbacks.onCancel(row),
            disabled: !canCancelThis,
            tooltip: !callbacks.canWrite
              ? 'You need dispatch:write to cancel dispatches.'
              : !canCancelThis
              ? 'Already delivered or cancelled.'
              : undefined,
          },
        ];
        return (
          <div className="flex justify-center">
            <RowActionMenu
              actions={actions}
              ariaLabel={`Actions for dispatch ${row.dispatchNumber}`}
            />
          </div>
        );
      },
    },
  ];
}

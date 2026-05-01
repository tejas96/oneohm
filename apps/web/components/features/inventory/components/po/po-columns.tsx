'use client';

import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import * as React from 'react';

import { PO_STATUS_COLOR, PO_STATUS_LABEL } from '../../constants';

import type { ColumnConfig } from '@/components/shared/advanced-table';
import { ProgressBarCell } from '@/components/shared/inventory/progress-bar-cell';
import { RowActionMenu, type RowAction } from '@/components/shared/inventory/row-action-menu';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { ROUTES } from '@/lib/config/routes';
import type { PurchaseOrder } from '@/lib/hooks/resources/purchase-orders';
import { formatCurrency } from '@/lib/utils';

export interface PoRowActionCallbacks {
  onView: (row: PurchaseOrder) => void;
  onApprove: (row: PurchaseOrder) => void;
  onSend: (row: PurchaseOrder) => void;
  onCancel: (row: PurchaseOrder) => void;
  canApprove: boolean;
  canWrite: boolean;
}

export type PoColumnRow = PurchaseOrder & Record<string, unknown>;

function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  } catch {
    return '—';
  }
}

function isOverdue(po: PurchaseOrder): boolean {
  if (po.status === 'received' || po.status === 'cancelled') return false;
  if (!po.expectedDeliveryDate) return false;
  return new Date(po.expectedDeliveryDate).getTime() < Date.now();
}

/**
 * Receive progress: total received qty / total ordered qty across all
 * line items. Returns null when items aren't loaded (list endpoint
 * doesn't include items). Falls back to status-based heuristic so the
 * column isn't blank: received => 100%, sent/confirmed => 0%, etc.
 */
function receiveProgress(po: PurchaseOrder): {
  numerator: number;
  denominator: number;
} | null {
  if (po.items && po.items.length > 0) {
    let ordered = 0;
    let received = 0;
    for (const i of po.items) {
      ordered += Number(i.orderedQuantity ?? 0);
      received += Number(i.receivedQuantity ?? 0);
    }
    if (ordered > 0) return { numerator: received, denominator: ordered };
  }
  if (po.status === 'received') return { numerator: 1, denominator: 1 };
  if (po.status === 'partially_received') return { numerator: 0.5, denominator: 1 };
  return null;
}

export function buildPoColumns(callbacks: PoRowActionCallbacks): ColumnConfig<PoColumnRow>[] {
  return [
    {
      field: 'poNumber',
      headerName: 'PO',
      flex: 1,
      sortable: true,
      renderCell: ({ row }) => (
        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-sm font-medium text-primary">{row.poNumber}</span>
          <span className="text-xs text-foreground-tertiary">
            {row.poType ? row.poType.replace(/_/g, ' ') : '—'}
          </span>
        </div>
      ),
    },
    {
      field: 'vendor.name',
      headerName: 'Vendor',
      flex: 1,
      sortable: false,
      renderCell: ({ row }) => (
        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-sm text-foreground">{row.vendor?.name ?? '—'}</span>
          {row.warehouse?.name ? (
            <span className="text-xs text-foreground-tertiary">→ {row.warehouse.name}</span>
          ) : null}
        </div>
      ),
    },
    {
      field: 'poDate',
      headerName: 'PO date',
      width: 110,
      sortable: true,
      renderCell: ({ row }) => (
        <span className="text-xs text-foreground-secondary">{formatDate(row.poDate)}</span>
      ),
    },
    {
      field: 'expectedDeliveryDate',
      headerName: 'Expected',
      width: 120,
      sortable: true,
      renderCell: ({ row }) => {
        const overdue = isOverdue(row);
        return (
          <span
            className={
              `text-xs ${  overdue ? 'font-medium text-warning' : 'text-foreground-secondary'}`
            }
            title={overdue ? 'Overdue' : undefined}
          >
            {formatDate(row.expectedDeliveryDate)}
          </span>
        );
      },
    },
    {
      field: 'totalAmount',
      headerName: 'Total',
      width: 130,
      sortable: true,
      renderCell: ({ row }) => (
        <div className="flex flex-col gap-0.5 text-right">
          <span className="text-sm font-medium tabular-nums text-foreground">
            {formatCurrency(Number(row.totalAmount ?? 0))}
          </span>
          {Number(row.outstandingAmount ?? 0) > 0 ? (
            <span className="text-[10px] text-foreground-tertiary">
              {formatCurrency(Number(row.outstandingAmount))} due
            </span>
          ) : null}
        </div>
      ),
    },
    {
      field: 'progress',
      headerName: 'Receive',
      width: 160,
      sortable: false,
      renderCell: ({ row }) => {
        const progress = receiveProgress(row);
        if (!progress) {
          return <span className="text-xs text-foreground-tertiary">—</span>;
        }
        return (
          <ProgressBarCell
            numerator={progress.numerator}
            denominator={progress.denominator}
            intent={progress.numerator >= progress.denominator ? 'success' : 'info'}
          />
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: ({ row }) => (
        <MUIStatusChip
          label={PO_STATUS_LABEL[row.status] ?? row.status}
          color={PO_STATUS_COLOR[row.status] ?? 'default'}
        />
      ),
    },
    {
      field: '__actions',
      headerName: '',
      width: 56,
      sortable: false,
      renderCell: ({ row }) => {
        const canApproveThis = callbacks.canApprove && row.status === 'pending_approval';
        const canSendThis =
          callbacks.canWrite && (row.status === 'approved' || row.status === 'confirmed');
        const canCancelThis =
          callbacks.canWrite && row.status !== 'received' && row.status !== 'cancelled';
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
              const href = `${ROUTES.INVENTORY.PURCHASE_ORDERS}/${row.id}`;
              window.open(href, '_blank', 'noopener');
            },
          },
          {
            id: 'approve',
            label: 'Approve',
            icon: <CheckCircleOutlineRoundedIcon sx={{ fontSize: 16 }} />,
            onSelect: () => callbacks.onApprove(row),
            disabled: !canApproveThis,
            tooltip: !callbacks.canApprove
              ? 'You need purchase-order:approve to approve POs.'
              : row.status !== 'pending_approval'
              ? 'Only POs awaiting approval can be approved.'
              : undefined,
          },
          {
            id: 'send',
            label: 'Send to vendor',
            icon: <SendOutlinedIcon sx={{ fontSize: 16 }} />,
            onSelect: () => callbacks.onSend(row),
            disabled: !canSendThis,
            tooltip: !callbacks.canWrite
              ? 'You need purchase-order:write to send POs.'
              : row.status !== 'approved' && row.status !== 'confirmed'
              ? 'Only approved or confirmed POs can be sent.'
              : undefined,
          },
          {
            id: 'cancel',
            label: 'Cancel PO',
            icon: <CancelOutlinedIcon sx={{ fontSize: 16 }} />,
            onSelect: () => callbacks.onCancel(row),
            disabled: !canCancelThis,
            tooltip: !callbacks.canWrite
              ? 'You need purchase-order:write to cancel POs.'
              : row.status === 'received'
              ? 'Received POs cannot be cancelled.'
              : row.status === 'cancelled'
              ? 'Already cancelled.'
              : undefined,
          },
        ];
        return (
          <div className="flex justify-center">
            <RowActionMenu actions={actions} ariaLabel={`Actions for ${row.poNumber}`} />
          </div>
        );
      },
    },
  ];
}

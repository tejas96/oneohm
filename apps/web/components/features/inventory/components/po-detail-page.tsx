'use client';

import { Menu, MenuItem, Skeleton } from '@mui/material';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { PoDetailHeader } from './po/po-detail-header';
import { PoDetailKpi } from './po/po-detail-kpi';
import { PoReceiveDialog } from './po-receive-dialog';

import { AdvancedTable, type ColumnConfig } from '@/components/shared/advanced-table';
import { ErrorState } from '@/components/shared/feedback';
import { ProgressBarCell } from '@/components/shared/inventory/progress-bar-cell';
import {
  Button as MUIButton,
  MUIDialog,
  MUIDialogBody,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIInput,
} from '@/components/ui';
import { MUITypography } from '@/components/ui/mui-typography';
import {
  usePurchaseOrder,
  usePurchaseOrderMutations,
  type PurchaseOrderItem,
} from '@/lib/hooks/resources/purchase-orders';
import { formatCurrency, formatDate } from '@/lib/utils';

type ItemRow = PurchaseOrderItem & Record<string, unknown>;

const ITEM_COLUMNS: ColumnConfig<ItemRow>[] = [
  {
    field: 'product.name',
    headerName: 'Product',
    flex: 1.5,
    renderCell: ({ row }) => (
      <div className="flex flex-col gap-0.5 py-1">
        <span className="text-sm font-medium text-foreground">{row.product?.name ?? '—'}</span>
        <span className="text-xs text-foreground-secondary">
          {row.product?.code ?? row.productId}
        </span>
      </div>
    ),
  },
  {
    field: 'orderedQuantity',
    headerName: 'Ordered',
    width: 90,
    renderCell: ({ row }) => (
      <span className="block text-right text-sm tabular-nums text-foreground">
        {Number(row.orderedQuantity)}
      </span>
    ),
  },
  {
    field: 'unitPrice',
    headerName: 'Unit price',
    width: 120,
    renderCell: ({ row }) => (
      <span className="block text-right text-sm tabular-nums text-foreground">
        {formatCurrency(Number(row.unitPrice))}
      </span>
    ),
  },
  {
    field: 'lineProgress',
    headerName: 'Received',
    width: 180,
    sortable: false,
    renderCell: ({ row }) => {
      const ordered = Number(row.orderedQuantity ?? 0);
      const received = Number(row.receivedQuantity ?? 0);
      if (ordered <= 0) {
        return <span className="text-xs text-foreground-tertiary">—</span>;
      }
      const intent: 'success' | 'info' = received >= ordered ? 'success' : 'info';
      return (
        <ProgressBarCell
          numerator={received}
          denominator={ordered}
          label={`${received} / ${ordered}`}
          intent={intent}
        />
      );
    },
  },
  {
    field: 'lineTotal',
    headerName: 'Line total',
    width: 130,
    renderCell: ({ row }) => (
      <span className="block text-right text-sm font-medium tabular-nums text-foreground">
        {formatCurrency(Number(row.lineTotal))}
      </span>
    ),
  },
];

function canSubmit(status: string): boolean {
  return status === 'draft';
}

function canApprove(status: string): boolean {
  return status === 'pending_approval';
}

function canSend(status: string): boolean {
  return status === 'approved';
}

function canReceive(status: string): boolean {
  return ['approved', 'sent', 'confirmed', 'partially_received'].includes(status);
}

function canCancel(status: string): boolean {
  return status !== 'received' && status !== 'partially_received' && status !== 'cancelled';
}

export function PoDetailPage(): React.JSX.Element {
  const params = useParams();
  const id = useMemo(() => {
    const raw = params?.id;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) return raw[0] ?? '';
    return '';
  }, [params]);

  const { data: po, isLoading, isError, isFetching, refetch } = usePurchaseOrder(id);
  const { action } = usePurchaseOrderMutations();

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);

  const rows: ItemRow[] = useMemo(() => (po?.items ?? []) as ItemRow[], [po?.items]);

  const handleAction = async (fn: () => Promise<unknown>): Promise<void> => {
    setBusy(true);
    try {
      await fn();
      void refetch();
    } catch {
      // toast in mutation
    } finally {
      setBusy(false);
      setMenuAnchor(null);
    }
  };

  if (!id) {
    return (
      <ErrorState title="Invalid purchase order" description="Please go back and try again." />
    );
  }

  if (isError) {
    return (
      <ErrorState title="Purchase order not found" description="Please go back and try again." />
    );
  }

  if (isLoading || !po) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton variant="rounded" height={40} className="max-w-md" />
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={280} />
      </div>
    );
  }

  const status = po.status;

  return (
    <div className="flex flex-col gap-4 p-6">
      <PoDetailHeader
        po={po}
        busy={busy}
        onActionsClick={(anchor) => setMenuAnchor(anchor)}
      />

      <PoDetailKpi po={po} />

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        {canSubmit(status) ? (
          <MenuItem
            disabled={busy}
            onClick={() => void handleAction(() => action('submit', po.id))}
          >
            Submit
          </MenuItem>
        ) : null}
        {canApprove(status) ? (
          <MenuItem
            disabled={busy}
            onClick={() => void handleAction(() => action('approve', po.id))}
          >
            Approve
          </MenuItem>
        ) : null}
        {canSend(status) ? (
          <MenuItem disabled={busy} onClick={() => void handleAction(() => action('send', po.id))}>
            Send
          </MenuItem>
        ) : null}
        {canReceive(status) ? (
          <MenuItem
            disabled={busy}
            onClick={() => {
              setMenuAnchor(null);
              setReceiveOpen(true);
            }}
          >
            Receive
          </MenuItem>
        ) : null}
        {canCancel(status) ? (
          <MenuItem
            disabled={busy}
            onClick={() => {
              setMenuAnchor(null);
              setCancelOpen(true);
            }}
          >
            Cancel
          </MenuItem>
        ) : null}
      </Menu>

      <PoReceiveDialog open={receiveOpen} onOpenChange={setReceiveOpen} po={po} />

      <MUIDialog open={cancelOpen} onOpenChange={setCancelOpen} size="default">
        <MUIDialogHeader>
          <MUIDialogTitle>Cancel purchase order</MUIDialogTitle>
        </MUIDialogHeader>
        <MUIDialogBody>
          <MUIInput
            fieldLabel="Reason"
            placeholder="Why is this PO being cancelled?"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            multiline
            minRows={2}
          />
        </MUIDialogBody>
        <MUIDialogFooter>
          <MUIButton variant="outline" onClick={() => setCancelOpen(false)} disabled={busy}>
            Back
          </MUIButton>
          <MUIButton
            variant="destructive"
            disabled={busy || !cancelReason.trim()}
            onClick={() =>
              void handleAction(async () => {
                await action('cancel', po.id, { reason: cancelReason.trim() });
                setCancelOpen(false);
                setCancelReason('');
              })
            }
          >
            Cancel PO
          </MUIButton>
        </MUIDialogFooter>
      </MUIDialog>

      <div className="grid gap-4 rounded-lg border border-border-light bg-background p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <MUITypography variant="finePrint" className="text-foreground-tertiary">
            PO date
          </MUITypography>
          <MUITypography variant="bodyPrimary">{formatDate(po.poDate)}</MUITypography>
        </div>
        <div>
          <MUITypography variant="finePrint" className="text-foreground-tertiary">
            Actual delivery
          </MUITypography>
          <MUITypography variant="bodyPrimary">
            {po.actualDeliveryDate ? formatDate(po.actualDeliveryDate) : '—'}
          </MUITypography>
        </div>
        <div>
          <MUITypography variant="finePrint" className="text-foreground-tertiary">
            Payment terms
          </MUITypography>
          <MUITypography variant="bodyPrimary">{po.paymentTerms ?? '—'}</MUITypography>
        </div>
        <div>
          <MUITypography variant="finePrint" className="text-foreground-tertiary">
            Subtotal · tax · total
          </MUITypography>
          <MUITypography variant="bodyPrimary">
            {formatCurrency(Number(po.subtotal))} ·{' '}
            {formatCurrency(Number(po.taxAmount))} ·{' '}
            <span className="font-semibold">
              {formatCurrency(Number(po.totalAmount))}
            </span>
          </MUITypography>
        </div>
        {po.notes ? (
          <div className="sm:col-span-2 lg:col-span-4">
            <MUITypography variant="finePrint" className="text-foreground-tertiary">
              Notes
            </MUITypography>
            <MUITypography variant="body" className="text-foreground-secondary">
              {po.notes}
            </MUITypography>
          </div>
        ) : null}
      </div>

      <div>
        <MUITypography variant="sectionTitle" className="mb-2">
          Line items
        </MUITypography>
        <AdvancedTable<ItemRow>
          columns={ITEM_COLUMNS}
          rows={rows}
          rowIdField="id"
          paginationMode="client"
          loading={false}
          refetching={isFetching}
          enableSearch={false}
          enablePagination={false}
          itemLabel="items"
        />
      </div>
    </div>
  );
}

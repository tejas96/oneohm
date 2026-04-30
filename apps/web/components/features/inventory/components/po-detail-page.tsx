'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Button, IconButton, Menu, MenuItem, Skeleton } from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { PO_STATUS_COLOR, PO_STATUS_LABEL } from '../constants';
import { PoReceiveDialog } from './po-receive-dialog';

import { AdvancedTable, type ColumnConfig } from '@/components/shared/advanced-table';
import { ErrorState } from '@/components/shared/feedback';
import {
  Button as MUIButton,
  MUIDialog,
  MUIDialogBody,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIInput,
} from '@/components/ui';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
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
    headerName: 'Qty',
    width: 100,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground">{Number(row.orderedQuantity)}</span>
    ),
  },
  {
    field: 'unitPrice',
    headerName: 'Unit price',
    width: 120,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground">{formatCurrency(Number(row.unitPrice))}</span>
    ),
  },
  {
    field: 'receivedQuantity',
    headerName: 'Received',
    width: 100,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground">{Number(row.receivedQuantity)}</span>
    ),
  },
  {
    field: 'lineTotal',
    headerName: 'Line total',
    width: 130,
    renderCell: ({ row }) => (
      <span className="text-sm font-medium text-foreground">
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
  const router = useRouter();
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconButton
            aria-label="Back"
            size="small"
            onClick={() => router.push(ROUTES.INVENTORY.PURCHASE_ORDERS)}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <div>
            <MUITypography variant="drawerTitle">{po.poNumber}</MUITypography>
            <MUITypography variant="timestamp" className="text-foreground-secondary mt-0.5">
              {po.vendor?.name ?? '—'} · {po.warehouse?.name ?? 'No warehouse'}
            </MUITypography>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MUIStatusChip
            label={PO_STATUS_LABEL[status] ?? status}
            color={PO_STATUS_COLOR[status] ?? 'default'}
          />
          <Button
            variant="outlined"
            size="small"
            endIcon={<MoreVertIcon />}
            disabled={busy}
            onClick={(e) => setMenuAnchor(e.currentTarget)}
          >
            Actions
          </Button>
        </div>
      </div>

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

      <div className="grid gap-4 rounded-lg border border-border-light p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <MUITypography variant="finePrint" className="text-foreground-secondary">
            PO date
          </MUITypography>
          <MUITypography variant="bodyPrimary">{formatDate(po.poDate)}</MUITypography>
        </div>
        <div>
          <MUITypography variant="finePrint" className="text-foreground-secondary">
            Expected delivery
          </MUITypography>
          <MUITypography variant="bodyPrimary">
            {po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : '—'}
          </MUITypography>
        </div>
        <div>
          <MUITypography variant="finePrint" className="text-foreground-secondary">
            Actual delivery
          </MUITypography>
          <MUITypography variant="bodyPrimary">
            {po.actualDeliveryDate ? formatDate(po.actualDeliveryDate) : '—'}
          </MUITypography>
        </div>
        <div>
          <MUITypography variant="finePrint" className="text-foreground-secondary">
            Subtotal
          </MUITypography>
          <MUITypography variant="bodyPrimary">{formatCurrency(Number(po.subtotal))}</MUITypography>
        </div>
        <div>
          <MUITypography variant="finePrint" className="text-foreground-secondary">
            Tax
          </MUITypography>
          <MUITypography variant="bodyPrimary">
            {formatCurrency(Number(po.taxAmount))}
          </MUITypography>
        </div>
        <div>
          <MUITypography variant="finePrint" className="text-foreground-secondary">
            Total
          </MUITypography>
          <MUITypography variant="bodyPrimary">
            {formatCurrency(Number(po.totalAmount))}
          </MUITypography>
        </div>
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

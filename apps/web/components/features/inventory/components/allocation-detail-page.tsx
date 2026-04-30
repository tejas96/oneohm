'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Button, IconButton, Skeleton } from '@mui/material';
import { StockAllocationStatus } from '@oneohm-epc/shared/types';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import {
  ALLOCATION_STATUS_COLOR,
  ALLOCATION_STATUS_LABEL,
  WAREHOUSE_TYPE_LABEL,
} from '../constants';

import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIInput,
  MUITypography,
} from '@/components/ui';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { ROUTES } from '@/lib/config/routes';
import {
  useStockAllocation,
  useStockAllocationMutations,
} from '@/lib/hooks/resources/stock-allocations';
import { formatDate } from '@/lib/utils';

function allocationIdLabel(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

export function AllocationDetailPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const { data, isLoading, isError, refetch } = useStockAllocation(id);
  const { action } = useStockAllocationMutations();

  const [returnOpen, setReturnOpen] = useState(false);
  const [fulfillOpen, setFulfillOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [returnQty, setReturnQty] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [fulfillQty, setFulfillQty] = useState('');
  const [fulfillNotes, setFulfillNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const remainingToFulfill = useMemo(() => {
    if (!data) return 0;
    return Math.max(0, Number(data.allocatedQuantity) - Number(data.dispatchedQuantity));
  }, [data]);

  const maxReturnable = useMemo(() => {
    if (!data) return 0;
    return Math.max(0, Number(data.dispatchedQuantity) - Number(data.returnedQuantity));
  }, [data]);

  const canCancel =
    data &&
    data.status !== StockAllocationStatus.CANCELLED &&
    data.status !== StockAllocationStatus.DISPATCHED;

  const canFulfill =
    data && data.status !== StockAllocationStatus.CANCELLED && remainingToFulfill > 0;

  const canReturn = data && maxReturnable > 0;

  const handleFulfill = async (): Promise<void> => {
    if (!data) return;
    const q = Number(fulfillQty);
    if (!Number.isFinite(q) || q <= 0 || q > remainingToFulfill) return;
    setActionBusy(true);
    try {
      await action('fulfill', data.id, {
        fulfilledQuantity: q,
        fulfillmentDate: new Date().toISOString().slice(0, 10),
        notes: fulfillNotes.trim() || undefined,
      });
      setFulfillOpen(false);
      setFulfillQty('');
      setFulfillNotes('');
      void refetch();
    } finally {
      setActionBusy(false);
    }
  };

  const handleCancel = async (): Promise<void> => {
    if (!data || !cancelReason.trim()) return;
    setActionBusy(true);
    try {
      await action('cancel', data.id, { reason: cancelReason.trim() });
      setCancelOpen(false);
      setCancelReason('');
      void refetch();
    } finally {
      setActionBusy(false);
    }
  };

  const handleReturn = async (): Promise<void> => {
    if (!data) return;
    const q = Number(returnQty);
    if (!Number.isFinite(q) || q <= 0 || q > maxReturnable || !returnReason.trim()) return;
    setActionBusy(true);
    try {
      await action('return', data.id, { quantity: q, reason: returnReason.trim() });
      setReturnOpen(false);
      setReturnQty('');
      setReturnReason('');
      void refetch();
    } finally {
      setActionBusy(false);
    }
  };

  if (!id) {
    return (
      <div className="p-6">
        <MUITypography variant="body" className="text-foreground-secondary">
          Invalid allocation.
        </MUITypography>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <MUITypography variant="alertTitle">Failed to load allocation</MUITypography>
        <Button variant="outlined" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton variant="rounded" height={40} />
        <Skeleton variant="rounded" height={200} />
      </div>
    );
  }

  const sourceLabel = WAREHOUSE_TYPE_LABEL[data.sourceType as string] ?? data.sourceType ?? '—';

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start gap-4">
        <IconButton
          aria-label="Back"
          onClick={() => router.push(ROUTES.INVENTORY.ALLOCATIONS)}
          size="small"
        >
          <ArrowBackIcon />
        </IconButton>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <MUITypography variant="drawerTitle">
              Allocation {allocationIdLabel(data.id)}
            </MUITypography>
            <MUIStatusChip
              label={ALLOCATION_STATUS_LABEL[data.status] ?? data.status}
              color={ALLOCATION_STATUS_COLOR[data.status] ?? 'default'}
            />
          </div>
          <MUITypography variant="body" className="text-foreground-secondary mt-2">
            {data.project?.name ?? '—'} · {data.product?.name ?? '—'} ·{' '}
            {data.warehouse?.name ?? '—'}
          </MUITypography>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCancel && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={() => setCancelOpen(true)}
            >
              Cancel
            </Button>
          )}
          {canFulfill && (
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                setFulfillQty(remainingToFulfill > 0 ? String(remainingToFulfill) : '');
                setFulfillOpen(true);
              }}
            >
              Fulfill
            </Button>
          )}
          {canReturn && (
            <Button variant="outlined" size="small" onClick={() => setReturnOpen(true)}>
              Return stock
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border border-border-light bg-background p-4 sm:grid-cols-2">
        <DetailItem label="Allocated quantity" value={String(data.allocatedQuantity)} />
        <DetailItem label="Dispatched quantity" value={String(data.dispatchedQuantity)} />
        <DetailItem label="Returned quantity" value={String(data.returnedQuantity)} />
        <DetailItem label="Created" value={data.createdAt ? formatDate(data.createdAt) : '—'} />
        <DetailItem label="Updated" value={data.updatedAt ? formatDate(data.updatedAt) : '—'} />
        <DetailItem label="Source type" value={sourceLabel} />
        <div className="sm:col-span-2">
          <MUITypography variant="finePrint" className="text-foreground-secondary">
            Notes
          </MUITypography>
          <MUITypography variant="body" className="mt-1">
            {data.notes?.trim() ? data.notes : '—'}
          </MUITypography>
        </div>
      </div>

      <MUIDialog open={returnOpen} onOpenChange={setReturnOpen} size="sm">
        <MUIDialogHeader>
          <MUIDialogTitle>Return stock</MUIDialogTitle>
        </MUIDialogHeader>
        <MUIDialogBody>
          <div className="flex flex-col gap-3">
            <MUIInput
              fieldLabel="Quantity"
              required
              type="number"
              inputProps={{ min: 0.001, max: maxReturnable, step: 'any' }}
              value={returnQty}
              onChange={(e) => setReturnQty(e.target.value)}
            />
            <MUIInput
              fieldLabel="Reason"
              required
              multiline
              minRows={2}
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
            />
            <MUITypography variant="finePrint" className="text-foreground-secondary">
              Max returnable: {maxReturnable}
            </MUITypography>
          </div>
        </MUIDialogBody>
        <MUIDialogFooter>
          <Button color="inherit" onClick={() => setReturnOpen(false)} disabled={actionBusy}>
            Close
          </Button>
          <Button variant="contained" onClick={() => void handleReturn()} disabled={actionBusy}>
            Submit
          </Button>
        </MUIDialogFooter>
      </MUIDialog>

      <MUIDialog open={fulfillOpen} onOpenChange={setFulfillOpen}>
        <MUIDialogHeader>
          <MUIDialogTitle>Fulfill allocation</MUIDialogTitle>
        </MUIDialogHeader>
        <MUIDialogBody>
          <div className="flex flex-col gap-3">
            <MUIInput
              fieldLabel="Quantity to fulfill"
              required
              type="number"
              inputProps={{ min: 0.001, max: remainingToFulfill, step: 'any' }}
              value={fulfillQty}
              onChange={(e) => setFulfillQty(e.target.value)}
            />
            <MUIInput
              fieldLabel="Notes (optional)"
              multiline
              minRows={2}
              value={fulfillNotes}
              onChange={(e) => setFulfillNotes(e.target.value)}
            />
            <MUITypography variant="finePrint" className="text-foreground-secondary">
              Remaining: {remainingToFulfill}
            </MUITypography>
          </div>
        </MUIDialogBody>
        <MUIDialogFooter>
          <Button color="inherit" onClick={() => setFulfillOpen(false)} disabled={actionBusy}>
            Close
          </Button>
          <Button variant="contained" onClick={() => void handleFulfill()} disabled={actionBusy}>
            Fulfill
          </Button>
        </MUIDialogFooter>
      </MUIDialog>

      <MUIDialog open={cancelOpen} onOpenChange={setCancelOpen} size="sm">
        <MUIDialogHeader>
          <MUIDialogTitle>Cancel allocation</MUIDialogTitle>
        </MUIDialogHeader>
        <MUIDialogBody>
          <MUIInput
            fieldLabel="Reason"
            required
            multiline
            minRows={2}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </MUIDialogBody>
        <MUIDialogFooter>
          <Button color="inherit" onClick={() => setCancelOpen(false)} disabled={actionBusy}>
            Close
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void handleCancel()}
            disabled={actionBusy}
          >
            Cancel allocation
          </Button>
        </MUIDialogFooter>
      </MUIDialog>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div>
      <MUITypography variant="finePrint" className="text-foreground-secondary">
        {label}
      </MUITypography>
      <MUITypography variant="bodyPrimary" className="mt-0.5">
        {value}
      </MUITypography>
    </div>
  );
}

'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Button, IconButton, Skeleton } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { DISPATCH_STATUS_COLOR, DISPATCH_STATUS_LABEL } from '../constants';

import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
import {
  useMaterialDispatch,
  useMaterialDispatchMutations,
  type MaterialDispatchItem,
} from '@/lib/hooks/resources/material-dispatches';
import { formatDate } from '@/lib/utils';

function shortId(id: string | undefined): string {
  if (!id) return '—';
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

export function DispatchDetailPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const { data, isLoading, isError, refetch } = useMaterialDispatch(id);
  const { action } = useMaterialDispatchMutations();
  const [busy, setBusy] = useState(false);

  const items = useMemo(() => data?.items ?? [], [data?.items]);

  const canMarkDispatched = data?.status === 'prepared';
  const canMarkDelivered = data?.status === 'in_transit' || data?.status === 'partially_delivered';

  const handleMarkDispatched = async (): Promise<void> => {
    if (!data) return;
    setBusy(true);
    try {
      await action('markDispatched', data.id);
      void refetch();
    } finally {
      setBusy(false);
    }
  };

  const handleMarkDelivered = async (): Promise<void> => {
    if (!data) return;
    setBusy(true);
    try {
      await action('markDelivered', data.id);
      void refetch();
    } finally {
      setBusy(false);
    }
  };

  if (!id) {
    return (
      <div className="p-6">
        <MUITypography variant="body" className="text-foreground-secondary">
          Invalid dispatch.
        </MUITypography>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <MUITypography variant="alertTitle">Failed to load dispatch</MUITypography>
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
        <Skeleton variant="rounded" height={240} />
      </div>
    );
  }

  const dispatchDateStr = data.dispatchDate ? formatDate(data.dispatchDate) : '—';
  const expectedStr = data.expectedDeliveryDate
    ? formatDate(data.expectedDeliveryDate)
    : data.deliveryDate
      ? formatDate(data.deliveryDate)
      : '—';
  const actualStr = data.actualDeliveryDate ? formatDate(data.actualDeliveryDate) : '—';

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start gap-4">
        <IconButton
          aria-label="Back"
          onClick={() => router.push(ROUTES.INVENTORY.DISPATCHES)}
          size="small"
        >
          <ArrowBackIcon />
        </IconButton>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <MUITypography variant="drawerTitle">{data.dispatchNumber}</MUITypography>
            <MUIStatusChip
              label={DISPATCH_STATUS_LABEL[data.status as string] ?? data.status}
              color={DISPATCH_STATUS_COLOR[data.status as string] ?? 'default'}
            />
          </div>
          <MUITypography variant="body" className="text-foreground-secondary mt-2">
            {data.project?.name ?? '—'} · {data.warehouse?.name ?? '—'}
          </MUITypography>
          <MUITypography variant="timestamp" className="text-foreground-secondary mt-1">
            Dispatch date: {dispatchDateStr} · Expected: {expectedStr}
            {data.actualDeliveryDate ? ` · Delivered: ${actualStr}` : ''}
          </MUITypography>
        </div>
        <div className="flex flex-wrap gap-2">
          {canMarkDispatched && (
            <Button
              variant="contained"
              size="small"
              disabled={busy}
              onClick={() => void handleMarkDispatched()}
            >
              Mark dispatched
            </Button>
          )}
          {canMarkDelivered && (
            <Button
              variant="outlined"
              size="small"
              disabled={busy}
              onClick={() => void handleMarkDelivered()}
            >
              Mark delivered
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border-light bg-background">
        <div className="border-b border-border-light p-4">
          <MUITypography variant="sectionTitle">Line items</MUITypography>
        </div>
        {items.length === 0 ? (
          <div className="p-6">
            <MUITypography variant="body" className="text-foreground-secondary">
              No items on this dispatch.
            </MUITypography>
          </div>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell>Allocation</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((row: MaterialDispatchItem) => {
                const qty = row.quantity ?? row.dispatchedQuantity ?? 0;
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span className="text-sm text-foreground">{row.product?.name ?? '—'}</span>
                      {row.product?.code ? (
                        <span className="ml-1 text-xs text-foreground-secondary">
                          ({row.product.code})
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell align="right">{qty}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-foreground-secondary">
                        {shortId(row.stockAllocationId)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

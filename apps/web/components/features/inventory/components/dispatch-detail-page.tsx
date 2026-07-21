'use client';

import { Button, Skeleton } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { DispatchDetailHeader } from './dispatches/dispatch-detail-header';
import { DispatchDetailKpi } from './dispatches/dispatch-detail-kpi';

import { MUITypography } from '@/components/ui/mui-typography';
import {
  useMaterialDispatch,
  useMaterialDispatchMutations,
  type MaterialDispatchItem,
} from '@/lib/hooks/resources/material-dispatches';
import { useAuth } from '@/providers/auth-provider';

function shortId(id: string | undefined): string {
  if (!id) return '—';
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

/**
 * Dispatch detail page (Part: rebuild-dispatch-pages).
 *
 * Composition:
 *   <DispatchDetailHeader/> – sticky bar with cross-link + actions
 *   <DispatchDetailKpi/>    – 4-tile strip with lifecycle metrics
 *   <LineItemsCard/>        – existing items table, retained verbatim
 *
 * mark-delivered fix: the call now sends `actualDeliveryDate` so the
 * detail KPI tile + header chip update in one round-trip without a
 * follow-up edit.
 */
export function DispatchDetailPage(): React.JSX.Element {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { data, isLoading, isError, refetch } = useMaterialDispatch(id);
  const { action } = useMaterialDispatchMutations();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('dispatch:write') || hasPermission('inventory:write');
  const [busy, setBusy] = useState(false);

  const items = useMemo(() => data?.items ?? [], [data?.items]);

  const canMarkDispatched = data?.status === 'prepared';
  const canMarkDelivered =
    data?.status === 'in_transit' ||
    data?.status === 'partially_delivered' ||
    data?.status === 'dispatched';

  const handleMarkDispatched = async (): Promise<void> => {
    if (!data) return;
    setBusy(true);
    try {
      await action('markDispatched', data.id, {});
      void refetch();
    } finally {
      setBusy(false);
    }
  };

  const handleMarkDelivered = async (): Promise<void> => {
    if (!data) return;
    setBusy(true);
    try {
      await action('markDelivered', data.id, {
        actualDeliveryDate: new Date().toISOString().slice(0, 10),
      });
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

  const headerActions = (
    <>
      {canMarkDispatched && canWrite && (
        <Button
          variant="contained"
          size="small"
          disabled={busy}
          onClick={() => void handleMarkDispatched()}
        >
          Mark dispatched
        </Button>
      )}
      {canMarkDelivered && canWrite && (
        <Button
          variant="outlined"
          size="small"
          disabled={busy}
          onClick={() => void handleMarkDelivered()}
        >
          Mark delivered
        </Button>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-4 p-6">
      <DispatchDetailHeader dispatch={data} actions={headerActions} />

      <DispatchDetailKpi dispatch={data} />

      <div className="rounded-lg shadow-e2 bg-background">
        <div className="p-4">
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

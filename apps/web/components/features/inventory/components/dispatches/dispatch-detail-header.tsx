'use client';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { IconButton, Tooltip } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { DISPATCH_STATUS_COLOR, DISPATCH_STATUS_LABEL } from '../../constants';

import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { ROUTES } from '@/lib/config/routes';
import type { MaterialDispatch } from '@/lib/hooks/resources/material-dispatches';
import { formatDate } from '@/lib/utils';

export interface DispatchDetailHeaderProps {
  dispatch: MaterialDispatch;
  /** Action buttons rendered to the right (Mark dispatched / delivered). */
  actions?: React.ReactNode;
}

export function DispatchDetailHeader({
  dispatch,
  actions,
}: DispatchDetailHeaderProps): React.JSX.Element {
  const router = useRouter();
  const expected = dispatch.expectedDeliveryDate ?? dispatch.deliveryDate ?? null;
  const overdue =
    expected &&
    new Date(expected).getTime() < Date.now() &&
    dispatch.status !== 'delivered' &&
    dispatch.status !== 'cancelled';

  return (
    <header className="sticky top-0 z-10 -mx-6 mb-2 flex flex-wrap items-start justify-between gap-3 border-b border-border bg-background px-6 py-3">
      <div className="flex items-start gap-3">
        <Tooltip title="Back to dispatches">
          <IconButton
            aria-label="Back"
            onClick={() => router.push(ROUTES.INVENTORY.DISPATCHES)}
            size="small"
          >
            <ArrowBackRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-base font-semibold leading-tight text-foreground">
              {dispatch.dispatchNumber}
            </h1>
            <MUIStatusChip
              label={DISPATCH_STATUS_LABEL[dispatch.status as string] ?? dispatch.status}
              color={DISPATCH_STATUS_COLOR[dispatch.status as string] ?? 'default'}
            />
            {overdue ? (
              <span className="rounded bg-error/10 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-error">
                Overdue
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-foreground-tertiary">
            {dispatch.warehouse ? (
              <>
                <span>From</span>
                <Link
                  href={ROUTES.INVENTORY.WAREHOUSE_DETAIL.replace('[id]', dispatch.warehouse.id)}
                  className="text-primary hover:underline"
                  prefetch={false}
                >
                  {dispatch.warehouse.name}
                </Link>
              </>
            ) : null}
            {dispatch.project?.name ? (
              <span>
                · for{' '}
                <span className="text-foreground">
                  {dispatch.project.name}
                  {dispatch.project.projectNumber ? ` (${dispatch.project.projectNumber})` : ''}
                </span>
              </span>
            ) : null}
            {dispatch.dispatchDate ? (
              <span>· dispatched {formatDate(dispatch.dispatchDate)}</span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </header>
  );
}

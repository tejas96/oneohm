'use client';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { Button, IconButton, Tooltip } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { ALLOCATION_STATUS_COLOR, ALLOCATION_STATUS_LABEL } from '../../constants';

import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { ROUTES } from '@/lib/config/routes';
import type { StockAllocation } from '@/lib/hooks/resources/stock-allocations';

export interface AllocationDetailHeaderProps {
  allocation: StockAllocation;
  /** Inline action buttons (Fulfill / Return / Cancel) rendered to the
   * right of the header. The parent owns the buttons because each one
   * opens its own dialog with its own state. */
  actions?: React.ReactNode;
}

export function AllocationDetailHeader({
  allocation,
  actions,
}: AllocationDetailHeaderProps): React.JSX.Element {
  const router = useRouter();
  const idSlug = allocation.id.length > 8 ? `${allocation.id.slice(0, 8)}…` : allocation.id;

  return (
    <header className="sticky top-0 z-10 -mx-6 mb-2 flex flex-wrap items-start justify-between gap-3 border-b border-border bg-background px-6 py-3">
      <div className="flex items-start gap-3">
        <Tooltip title="Back to allocations">
          <IconButton
            aria-label="Back"
            onClick={() => router.push(ROUTES.INVENTORY.ALLOCATIONS)}
            size="small"
          >
            <ArrowBackRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-base font-semibold leading-tight text-foreground">
              Allocation {idSlug}
            </h1>
            <MUIStatusChip
              label={ALLOCATION_STATUS_LABEL[allocation.status] ?? allocation.status}
              color={ALLOCATION_STATUS_COLOR[allocation.status] ?? 'default'}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-foreground-tertiary">
            <span>{allocation.product?.name ?? '—'}</span>
            {allocation.warehouse ? (
              <>
                <span>· from</span>
                <Link
                  href={ROUTES.INVENTORY.WAREHOUSE_DETAIL.replace('[id]', allocation.warehouse.id)}
                  className="text-primary hover:underline"
                  prefetch={false}
                >
                  {allocation.warehouse.name}
                </Link>
              </>
            ) : null}
            {allocation.project?.name ? (
              <span>
                · for{' '}
                <span className="text-foreground">
                  {allocation.project.name}
                  {allocation.project.projectNumber
                    ? ` (${allocation.project.projectNumber})`
                    : ''}
                </span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </header>
  );
}

export const AllocationDetailHeaderButton = Button;

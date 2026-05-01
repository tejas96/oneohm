'use client';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import { Button, IconButton, Tooltip } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { PO_STATUS_COLOR, PO_STATUS_LABEL } from '../../constants';

import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { ROUTES } from '@/lib/config/routes';
import type { PurchaseOrder } from '@/lib/hooks/resources/purchase-orders';

export interface PoDetailHeaderProps {
  po: PurchaseOrder;
  busy: boolean;
  onActionsClick: (anchor: HTMLElement) => void;
}

/**
 * Sticky header for PO detail. Mirrors warehouse/vendor headers:
 * back btn + identity (PO number, type chip, status chip) +
 * cross-links to vendor/warehouse/project + an Actions menu trigger.
 *
 * Cross-links use next/link prefetch to keep navigation snappy. We
 * intentionally don't render an Edit button here — PO mutations live
 * in the actions menu where the workflow context is clearer.
 */
export function PoDetailHeader({
  po,
  busy,
  onActionsClick,
}: PoDetailHeaderProps): React.JSX.Element {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-10 -mx-6 mb-2 flex flex-wrap items-start justify-between gap-3 border-b border-border bg-background px-6 py-3">
      <div className="flex items-start gap-3">
        <Tooltip title="Back to purchase orders">
          <IconButton
            aria-label="Back"
            onClick={() => router.push(ROUTES.INVENTORY.PURCHASE_ORDERS)}
            size="small"
          >
            <ArrowBackRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-base font-semibold leading-tight text-foreground">
              {po.poNumber}
            </h1>
            <MUIStatusChip
              label={PO_STATUS_LABEL[po.status] ?? po.status}
              color={PO_STATUS_COLOR[po.status] ?? 'default'}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-foreground-tertiary">
            {po.vendor ? (
              <Link
                href={ROUTES.INVENTORY.VENDOR_DETAIL.replace('[id]', po.vendor.id)}
                className="text-primary hover:underline"
                prefetch={false}
              >
                {po.vendor.name}
              </Link>
            ) : null}
            {po.warehouse ? (
              <>
                <span>→</span>
                <Link
                  href={ROUTES.INVENTORY.WAREHOUSE_DETAIL.replace('[id]', po.warehouse.id)}
                  className="text-primary hover:underline"
                  prefetch={false}
                >
                  {po.warehouse.name}
                </Link>
              </>
            ) : null}
            {po.project?.name ? <span>· {po.project.name}</span> : null}
            {po.poType ? <span>· {po.poType.replace(/_/g, ' ')}</span> : null}
          </div>
        </div>
      </div>
      <Button
        variant="outlined"
        size="small"
        endIcon={<MoreVertRoundedIcon />}
        disabled={busy}
        onClick={(e) => onActionsClick(e.currentTarget)}
      >
        Actions
      </Button>
    </header>
  );
}

'use client';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import { Button, IconButton } from '@mui/material';
import Link from 'next/link';
import * as React from 'react';

import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
import type { InventoryStock } from '@/lib/hooks/resources/inventory-stock';

/**
 * Sticky page header for the stock detail page. Renders breadcrumb-ish
 * back arrow, title (product name + code), warehouse subtitle, status
 * chip, and the two primary actions (Adjust, Transfer). Permission
 * gating happens here so the detail page parent stays compact.
 */

export interface StockDetailHeaderProps {
  stock: InventoryStock;
  isLow: boolean;
  canAdjust: boolean;
  canTransfer: boolean;
  onAdjust: () => void;
  onTransfer: () => void;
}

export function StockDetailHeader({
  stock,
  isLow,
  canAdjust,
  canTransfer,
  onAdjust,
  onTransfer,
}: StockDetailHeaderProps): React.JSX.Element {
  return (
    <div className="sticky top-header z-10 -mx-6 flex items-start justify-between gap-4 border-b border-border-light bg-white/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="flex min-w-0 items-start gap-2">
        <IconButton
          component={Link}
          href={ROUTES.INVENTORY.STOCK}
          size="small"
          aria-label="Back to stock list"
          sx={{ mt: 0.25 }}
        >
          <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MUITypography variant="drawerTitle" className="truncate">
              {stock.product?.name ?? stock.productId}
            </MUITypography>
            <MUIStatusChip
              label={isLow ? 'Low Stock' : 'In Stock'}
              color={isLow ? 'warning' : 'success'}
            />
          </div>
          <MUITypography variant="body" className="mt-1 text-foreground-secondary">
            {stock.product?.code ? `${stock.product.code} · ` : ''}
            {stock.warehouse?.name ?? stock.warehouseId}
            {stock.warehouse?.code ? ` (${stock.warehouse.code})` : ''}
          </MUITypography>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="small"
          variant="outlined"
          startIcon={<SwapHorizRoundedIcon sx={{ fontSize: 16 }} />}
          onClick={onTransfer}
          disabled={!canTransfer || Number(stock.availableQuantity) <= 0}
          title={
            !canTransfer
              ? 'You need stock:transfer to move stock between warehouses.'
              : Number(stock.availableQuantity) <= 0
                ? 'Nothing to transfer — available quantity is zero.'
                : undefined
          }
        >
          Transfer
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
          onClick={onAdjust}
          disabled={!canAdjust}
          title={
            canAdjust ? undefined : 'You need stock:adjust to change quantities.'
          }
        >
          Adjust
        </Button>
      </div>
    </div>
  );
}

StockDetailHeader.displayName = 'StockDetailHeader';

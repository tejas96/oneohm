'use client';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { Button, Chip, IconButton, Tooltip } from '@mui/material';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import {
  WAREHOUSE_STATUS_COLOR,
  WAREHOUSE_STATUS_LABEL,
  WAREHOUSE_TYPE_LABEL,
} from '../../constants';

import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { ROUTES } from '@/lib/config/routes';
import type { Warehouse } from '@/lib/hooks/resources/warehouses';

/**
 * Sticky header for the warehouse detail page. Mirrors stock-detail-header
 * shape: back button + identity + chips + permission-gated quick actions.
 *
 * Address line is rendered as `address · city, state · pincode`, with
 * empty segments stripped (so a warehouse with only a city renders
 * cleanly without leading/trailing separators).
 */

export interface WarehouseDetailHeaderProps {
  warehouse: Warehouse;
  canEdit: boolean;
  onEdit: () => void;
}

export function WarehouseDetailHeader({
  warehouse,
  canEdit,
  onEdit,
}: WarehouseDetailHeaderProps): React.JSX.Element {
  const router = useRouter();
  const addressLine = [
    warehouse.address,
    [warehouse.city, warehouse.state].filter(Boolean).join(', '),
    warehouse.pincode,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <header className="sticky top-0 z-10 -mx-6 mb-2 flex flex-wrap items-start justify-between gap-3 border-b border-border bg-background px-6 py-3">
      <div className="flex items-start gap-3">
        <Tooltip title="Back to warehouses">
          <IconButton
            aria-label="Back to warehouses"
            onClick={() => router.push(ROUTES.INVENTORY.WAREHOUSES)}
            size="small"
          >
            <ArrowBackRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-base font-semibold leading-tight text-foreground">
              {warehouse.name}
            </h1>
            <Chip
              size="small"
              variant="outlined"
              label={WAREHOUSE_TYPE_LABEL[warehouse.warehouseType] ?? warehouse.warehouseType}
            />
            <MUIStatusChip
              label={WAREHOUSE_STATUS_LABEL[warehouse.status] ?? warehouse.status}
              color={WAREHOUSE_STATUS_COLOR[warehouse.status] ?? 'default'}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-foreground-tertiary">
            <span>{warehouse.code}</span>
            {addressLine ? <span>· {addressLine}</span> : null}
            {warehouse.contactPerson ? <span>· {warehouse.contactPerson}</span> : null}
          </div>
        </div>
      </div>
      <Tooltip
        title={canEdit ? 'Edit warehouse' : 'You need inventory:write to edit warehouses.'}
      >
        <span>
          <Button
            variant="outlined"
            size="small"
            startIcon={<EditRoundedIcon />}
            onClick={onEdit}
            disabled={!canEdit}
          >
            Edit
          </Button>
        </span>
      </Tooltip>
    </header>
  );
}

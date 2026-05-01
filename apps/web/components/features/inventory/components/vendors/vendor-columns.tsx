'use client';

import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import * as React from 'react';

import { VENDOR_TYPE_LABEL } from '../../constants';

import type { ColumnConfig } from '@/components/shared/advanced-table';
import { RowActionMenu, type RowAction } from '@/components/shared/inventory/row-action-menu';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { ROUTES } from '@/lib/config/routes';
import type { Vendor } from '@/lib/hooks/resources/vendors';

export interface VendorRowActionCallbacks {
  onView: (row: Vendor) => void;
  onEdit: (row: Vendor) => void;
  canEdit: boolean;
}

export type VendorColumnRow = Vendor & Record<string, unknown>;

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  blacklisted: 'Blacklisted',
};

const STATUS_COLOR: Record<string, 'success' | 'default' | 'error'> = {
  active: 'success',
  inactive: 'default',
  blacklisted: 'error',
};

/**
 * Inline rating display. We render up to 5 outline stars with the
 * filled portion based on rating/5. Half-stars aren't supported by
 * MUI's StarRounded variant so we round to the nearest whole star.
 * Rationale: a full star icon is more legible at table density than
 * fractional bars, and operators rarely care about ±0.5 deltas.
 */
function RatingCell({ rating }: { rating?: number }): React.JSX.Element {
  if (rating == null || rating <= 0) {
    return <span className="text-xs text-foreground-tertiary">—</span>;
  }
  const filled = Math.round(Math.max(0, Math.min(5, Number(rating))));
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`${Number(rating).toFixed(1)} out of 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <StarRoundedIcon
          key={i}
          sx={{
            fontSize: 14,
            color: i < filled ? '#f59e0b' : 'rgb(228 228 231)',
          }}
        />
      ))}
      <span className="ml-1 text-xs tabular-nums text-foreground-secondary">
        {Number(rating).toFixed(1)}
      </span>
    </div>
  );
}

export function buildVendorColumns(
  callbacks: VendorRowActionCallbacks,
): ColumnConfig<VendorColumnRow>[] {
  return [
    {
      field: 'name',
      headerName: 'Vendor',
      flex: 2,
      sortable: true,
      renderCell: ({ row }) => (
        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-sm font-medium text-foreground">{row.name}</span>
          <span className="text-xs text-foreground-tertiary">{row.code}</span>
        </div>
      ),
    },
    {
      field: 'vendorType',
      headerName: 'Type',
      width: 130,
      renderCell: ({ row }) => (
        <span className="text-sm text-foreground capitalize">
          {VENDOR_TYPE_LABEL[row.vendorType] ?? row.vendorType}
        </span>
      ),
    },
    {
      field: 'contact',
      headerName: 'Contact',
      flex: 1,
      sortable: false,
      renderCell: ({ row }) => (
        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-sm text-foreground">
            {row.contactPerson ?? '—'}
          </span>
          <span className="text-xs text-foreground-tertiary">
            {row.email ?? row.phone ?? ''}
          </span>
        </div>
      ),
    },
    {
      field: 'location',
      headerName: 'Location',
      flex: 1,
      sortable: false,
      renderCell: ({ row }) => {
        const loc = [row.city, row.state, row.country].filter(Boolean).join(', ');
        return (
          <span className="text-sm text-foreground-secondary">{loc || '—'}</span>
        );
      },
    },
    {
      field: 'rating',
      headerName: 'Rating',
      width: 130,
      sortable: true,
      renderCell: ({ row }) => <RatingCell rating={row.rating} />,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: ({ row }) => (
        <MUIStatusChip
          label={STATUS_LABEL[row.status] ?? row.status}
          color={STATUS_COLOR[row.status] ?? 'default'}
        />
      ),
    },
    {
      field: '__actions',
      headerName: '',
      width: 56,
      sortable: false,
      renderCell: ({ row }) => {
        const actions: RowAction[] = [
          {
            id: 'view',
            label: 'View detail',
            icon: <VisibilityOutlinedIcon sx={{ fontSize: 16 }} />,
            onSelect: () => callbacks.onView(row),
          },
          {
            id: 'open',
            label: 'Open in new tab',
            icon: <OpenInNewRoundedIcon sx={{ fontSize: 16 }} />,
            onSelect: () => {
              const href = ROUTES.INVENTORY.VENDOR_DETAIL.replace('[id]', row.id);
              window.open(href, '_blank', 'noopener');
            },
          },
          {
            id: 'edit',
            label: 'Edit vendor',
            icon: <EditOutlinedIcon sx={{ fontSize: 16 }} />,
            onSelect: () => callbacks.onEdit(row),
            disabled: !callbacks.canEdit,
            tooltip: callbacks.canEdit
              ? undefined
              : 'You need inventory:write to edit vendors.',
          },
        ];
        return (
          <div className="flex justify-center">
            <RowActionMenu actions={actions} ariaLabel={`Actions for ${row.name}`} />
          </div>
        );
      },
    },
  ];
}

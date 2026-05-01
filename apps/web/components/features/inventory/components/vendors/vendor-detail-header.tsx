'use client';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { Button, Chip, IconButton, Tooltip } from '@mui/material';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { VENDOR_STATUS_COLOR, VENDOR_STATUS_LABEL, VENDOR_TYPE_LABEL } from '../../constants';

import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { ROUTES } from '@/lib/config/routes';
import type { Vendor } from '@/lib/hooks/resources/vendors';

export interface VendorDetailHeaderProps {
  vendor: Vendor;
  canEdit: boolean;
  onEdit: () => void;
}

function RatingDisplay({ rating }: { rating?: number }): React.JSX.Element | null {
  if (rating == null || rating <= 0) return null;
  const filled = Math.round(Math.max(0, Math.min(5, Number(rating))));
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${Number(rating).toFixed(1)} out of 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <StarRoundedIcon
          key={i}
          sx={{ fontSize: 14, color: i < filled ? '#f59e0b' : 'rgb(228 228 231)' }}
        />
      ))}
      <span className="ml-1 text-xs tabular-nums text-foreground-secondary">
        {Number(rating).toFixed(1)}
      </span>
    </span>
  );
}

export function VendorDetailHeader({
  vendor,
  canEdit,
  onEdit,
}: VendorDetailHeaderProps): React.JSX.Element {
  const router = useRouter();
  const contact = [vendor.contactPerson, vendor.email, vendor.phone].filter(Boolean).join(' · ');

  return (
    <header className="sticky top-0 z-10 -mx-6 mb-2 flex flex-wrap items-start justify-between gap-3 border-b border-border bg-background px-6 py-3">
      <div className="flex items-start gap-3">
        <Tooltip title="Back to vendors">
          <IconButton
            aria-label="Back to vendors"
            onClick={() => router.push(ROUTES.INVENTORY.VENDORS)}
            size="small"
          >
            <ArrowBackRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-base font-semibold leading-tight text-foreground">
              {vendor.name}
            </h1>
            <Chip
              size="small"
              variant="outlined"
              label={VENDOR_TYPE_LABEL[vendor.vendorType] ?? vendor.vendorType}
            />
            <MUIStatusChip
              label={VENDOR_STATUS_LABEL[vendor.status] ?? vendor.status}
              color={VENDOR_STATUS_COLOR[vendor.status] ?? 'default'}
            />
            <RatingDisplay rating={vendor.rating} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-foreground-tertiary">
            <span>{vendor.code}</span>
            {contact ? <span>· {contact}</span> : null}
            {vendor.gstin ? <span>· GSTIN {vendor.gstin}</span> : null}
          </div>
        </div>
      </div>
      <Tooltip title={canEdit ? 'Edit vendor' : 'You need inventory:write to edit vendors.'}>
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

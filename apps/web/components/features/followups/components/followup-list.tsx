'use client';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Box, Button, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { FollowupStatus, type LeadTemperature } from '@tejas96/shared/types';
import Link from 'next/link';
import { useMemo, useState, type JSX } from 'react';

import { type FollowupResponse } from '../hooks/use-followups';

import {
  CrmStatusPill,
  CrmTable,
  type CrmColumn,
  type CrmTone,
} from '@/components/shared/crm-table';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { crm } from '@/lib/theme/tokens';
import { formatDate } from '@/lib/utils';

const TEMPERATURE_TONE: Record<string, CrmTone> = {
  hot: 'danger',
  warm: 'warning',
  cold: 'info',
};

/**
 * Days between a scheduled date and today, in local calendar days.
 *
 * Compared at midnight rather than by elapsed hours, so a followup due at 09:00
 * still reads "today" at 17:00 instead of flipping to "1d late".
 */
function daysFromToday(scheduledAt: string): number {
  const scheduled = new Date(scheduledAt);
  const a = new Date(scheduled.getFullYear(), scheduled.getMonth(), scheduled.getDate());
  const now = new Date();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

function dueLabel(scheduledAt: string): { text: string; tone: CrmTone } {
  const days = daysFromToday(scheduledAt);
  if (days < 0) return { text: `${Math.abs(days)}d late`, tone: 'danger' };
  if (days === 0) return { text: 'Today', tone: 'warning' };
  if (days === 1) return { text: 'Tomorrow', tone: 'info' };
  return { text: formatDate(scheduledAt), tone: 'neutral' };
}

const leadName = (followup: FollowupResponse): string => {
  if (followup.property) {
    return followup.property.propertyName?.trim() || followup.property.city?.trim() || 'Property';
  }
  return (
    [followup.customer?.firstName, followup.customer?.lastName].filter(Boolean).join(' ').trim() ||
    'Customer lead'
  );
};

const ownerName = (followup: FollowupResponse): string =>
  [followup.assignedToUser?.firstName, followup.assignedToUser?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Unassigned';

export interface FollowupListProps {
  rows: FollowupResponse[];
  loading?: boolean;
  totalRowCount?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onComplete: (followup: FollowupResponse) => void;
  onReschedule: (followup: FollowupResponse) => void;
  onReassign: (followups: FollowupResponse[]) => void;
  onCancel: (followup: FollowupResponse) => void;
  emptyMessage?: string;
}

/**
 * The followup grid.
 *
 * Props-driven scope so one component serves the property tab, the customer
 * tab, /followups and — later — the dashboard widget, rather than each growing
 * its own table.
 */
export function FollowupList({
  rows,
  loading,
  totalRowCount,
  page,
  pageSize,
  onPageChange,
  onComplete,
  onReschedule,
  onReassign,
  onCancel,
  emptyMessage,
}: FollowupListProps): JSX.Element {
  const [menuFor, setMenuFor] = useState<FollowupResponse | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const closeMenu = (): void => {
    setMenuAnchor(null);
    setMenuFor(null);
  };

  const columns = useMemo<CrmColumn<FollowupResponse>[]>(
    () => [
      {
        field: 'due',
        header: 'Due',
        track: crm['col-onboarded'],
        renderCell: (row) => {
          const due = dueLabel(row.scheduledAt);
          return <CrmStatusPill label={due.text} tone={due.tone} size="sm" />;
        },
      },
      {
        field: 'lead',
        header: 'Lead',
        track: crm['col-customer'],
        stopPropagation: true,
        renderCell: (row) => (
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Link
              href={
                row.propertyId
                  ? buildRoute(ROUTES.PROPERTIES.DETAIL, { id: row.propertyId })
                  : buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: row.customerId })
              }
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <Typography variant="body2" fontWeight={600} noWrap>
                {leadName(row)}
              </Typography>
            </Link>
            <Typography variant="caption" color="text.secondary" noWrap>
              {row.propertyId ? (row.property?.city ?? 'Site') : 'Customer lead'}
            </Typography>
          </Stack>
        ),
      },
      {
        field: 'temperature',
        header: 'Temp',
        track: crm['col-status'],
        renderCell: (row) => {
          const temp = row.property?.leadTemperature as LeadTemperature | undefined;
          if (!temp)
            return (
              <Typography variant="caption" color="text.secondary">
                —
              </Typography>
            );
          return (
            <CrmStatusPill
              label={temp.charAt(0).toUpperCase() + temp.slice(1)}
              tone={TEMPERATURE_TONE[temp] ?? 'neutral'}
              size="sm"
            />
          );
        },
      },
      {
        field: 'subject',
        header: 'Subject',
        track: crm['col-location'],
        renderCell: (row) => (
          <Typography variant="body2" noWrap>
            {row.subject}
          </Typography>
        ),
      },
      {
        field: 'owner',
        header: 'Owner',
        track: crm['col-owner'],
        renderCell: (row) => (
          <Typography variant="body2" noWrap>
            {ownerName(row)}
          </Typography>
        ),
      },
      {
        field: 'actions',
        header: '',
        track: crm['col-actions'],
        align: 'right',
        hideable: false,
        stopPropagation: true,
        renderCell: (row) => (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
            {row.status === FollowupStatus.PENDING && (
              <Button size="small" onClick={() => onComplete(row)}>
                Complete
              </Button>
            )}
            <IconButton
              size="small"
              aria-label="More actions"
              onClick={(event) => {
                setMenuAnchor(event.currentTarget);
                setMenuFor(row);
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Stack>
        ),
      },
    ],
    [onComplete],
  );

  return (
    <Box>
      <CrmTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        loading={loading}
        density="compact"
        enableRowSelection
        selectionLabel={(count) => `${count} follow-up${count === 1 ? '' : 's'} selected`}
        bulkActions={[
          {
            label: 'Reassign',
            variant: 'primary',
            onClick: (selected) => onReassign(selected),
          },
        ]}
        page={page}
        pageSize={pageSize}
        totalRowCount={totalRowCount}
        onPageChange={onPageChange}
        itemLabel="follow-ups"
        /**
         * Narrower than the shared 1280px default: this grid has six columns,
         * not the customer list's ten. At the default the Complete button —
         * the whole point of the row — sits off-screen behind a horizontal
         * scrollbar.
         */
        gridMinWidth="880px"
        emptyMessage={emptyMessage ?? 'Nothing here.'}
      />

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem
          disabled={menuFor?.status !== FollowupStatus.PENDING}
          onClick={() => {
            if (menuFor) onReschedule(menuFor);
            closeMenu();
          }}
        >
          Reschedule
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuFor) onReassign([menuFor]);
            closeMenu();
          }}
        >
          Reassign
        </MenuItem>
        <MenuItem
          disabled={menuFor?.status !== FollowupStatus.PENDING}
          onClick={() => {
            if (menuFor) onCancel(menuFor);
            closeMenu();
          }}
        >
          Cancel
        </MenuItem>
      </Menu>
    </Box>
  );
}

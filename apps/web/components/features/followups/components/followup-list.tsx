'use client';

import { Box, Link, Stack, Typography } from '@mui/material';
import { followupIstDayDiff, type LeadTemperature } from '@tejas96/shared/types';
import { useRouter } from 'next/navigation';
import { useMemo, type JSX } from 'react';

import { FOLLOWUP_GRID_TRACKS } from '../constants';
import { FollowupRowActions } from './followup-row-actions';
import { type FollowupResponse } from '../hooks/use-followups';
import { crmToneFromDue, followupDueTone } from '../lib/due';
import { followupRecordHref } from '../lib/followup-href';

import {
  CrmStatusPill,
  CrmTable,
  type CrmColumn,
  type CrmTone,
} from '@/components/shared/crm-table';
import { crm } from '@/lib/theme/tokens';
import { formatFollowupClockTime, formatFollowupWhen } from '@/lib/utils';

/** Keeps adjacent cells from painting into each other. */
const CELL_GUTTER = { pr: 2, overflow: 'hidden', minWidth: 0 } as const;

const TEMPERATURE_TONE: Record<string, CrmTone> = {
  hot: 'danger',
  warm: 'warning',
  cold: 'info',
};

function dueLabel(scheduledAt: string, now = new Date()): { text: string; tone: CrmTone } {
  const days = followupIstDayDiff(new Date(scheduledAt), now);
  const time = formatFollowupClockTime(scheduledAt);
  const tone = crmToneFromDue(followupDueTone(scheduledAt, now));

  if (days < 0) return { text: `${Math.abs(days)}d late · ${time}`, tone };
  if (days === 0) return { text: `Today, ${time}`, tone };
  if (days === 1) return { text: `Tomorrow, ${time}`, tone };
  return { text: formatFollowupWhen(scheduledAt, now), tone };
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
  onViewDetails: (followup: FollowupResponse) => void;
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
  onViewDetails,
  onComplete,
  onReschedule,
  onReassign,
  onCancel,
  emptyMessage,
}: FollowupListProps): JSX.Element {
  const router = useRouter();

  const columns = useMemo<CrmColumn<FollowupResponse>[]>(
    () => [
      {
        field: 'due',
        header: 'Due',
        track: FOLLOWUP_GRID_TRACKS.due,
        cellSx: CELL_GUTTER,
        renderCell: (row) => {
          const due = dueLabel(row.scheduledAt);
          return <CrmStatusPill label={due.text} tone={due.tone} size="sm" />;
        },
      },
      {
        field: 'lead',
        header: 'Lead',
        track: FOLLOWUP_GRID_TRACKS.lead,
        stopPropagation: true,
        cellSx: CELL_GUTTER,
        renderCell: (row) => {
          const href = followupRecordHref(row);
          const name = (
            <Typography variant="body2" fontWeight={600} noWrap>
              {leadName(row)}
            </Typography>
          );
          return (
            <Stack spacing={0.25} sx={{ minWidth: 0, width: '100%', overflow: 'hidden' }}>
              {href ? (
                <Link
                  href={href}
                  underline="none"
                  color="inherit"
                  sx={{ display: 'block', minWidth: 0, overflow: 'hidden' }}
                >
                  {name}
                </Link>
              ) : (
                name
              )}
              <Typography variant="caption" color="text.secondary" noWrap>
                {row.propertyId ? (row.property?.city ?? 'Site') : 'Customer lead'}
              </Typography>
            </Stack>
          );
        },
      },
      {
        field: 'temperature',
        header: 'Temp',
        track: FOLLOWUP_GRID_TRACKS.temperature,
        cellSx: CELL_GUTTER,
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
        track: FOLLOWUP_GRID_TRACKS.subject,
        cellSx: CELL_GUTTER,
        renderCell: (row) => (
          <Typography variant="body2" noWrap sx={{ width: '100%' }}>
            {row.subject}
          </Typography>
        ),
      },
      {
        field: 'owner',
        header: 'Owner',
        track: FOLLOWUP_GRID_TRACKS.owner,
        cellSx: CELL_GUTTER,
        renderCell: (row) => (
          <Typography variant="body2" noWrap sx={{ width: '100%' }}>
            {ownerName(row)}
          </Typography>
        ),
      },
      {
        field: 'actions',
        header: '',
        track: FOLLOWUP_GRID_TRACKS.actions,
        align: 'right',
        hideable: false,
        stopPropagation: true,
        cellSx: { pl: 2, minWidth: 0 },
        renderCell: (row) => (
          <FollowupRowActions
            followup={row}
            onViewDetails={onViewDetails}
            onComplete={onComplete}
            onReschedule={onReschedule}
            onReassign={(f) => onReassign([f])}
            onCancel={onCancel}
          />
        ),
      },
    ],
    [onViewDetails, onComplete, onReschedule, onReassign, onCancel],
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
        gridMinWidth={crm['grid-min-width-followup']}
        emptyMessage={emptyMessage ?? 'Nothing here.'}
        onRowClick={(row) => {
          const href = followupRecordHref(row, { followupId: row.id });
          if (href) void router.push(href);
        }}
      />
    </Box>
  );
}

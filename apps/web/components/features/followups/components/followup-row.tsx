'use client';

import { Checkbox } from '@mui/material';
import { FollowupStatus, followupIstDayDiff, type LeadTemperature } from '@tejas96/shared/types';
import Link from 'next/link';
import { type CSSProperties, type JSX, memo } from 'react';

import { FollowupRowActions } from './followup-row-actions';
import { FOLLOWUP_ROW_TEMPLATE } from '../constants';
import { type FollowupResponse } from '../hooks/use-followups';
import { crmToneFromDue, followupDueTone } from '../lib/due';
import { followupRecordHref } from '../lib/followup-href';

import { ABOVE, BONE, CalmRow, SKELETON_CARD, stopRowClick } from '@/components/shared/calm-list';
import { CrmStatusPill, type CrmTone } from '@/components/shared/crm-table';
import { cn, formatFollowupClockTime, formatFollowupWhen } from '@/lib/utils';

/**
 * Wide: tick · due · customer / site · temperature · subject · owner · actions
 * on one line. Narrow (the list itself under 960px, so an open side panel
 * counts): tick, who and actions, then when it is due, then the subject beside
 * the temperature, then the owner.
 */
const ROW_GRID =
  'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 @[960px]:grid-cols-[var(--followup-cols)] @[960px]:gap-[18px]';

/**
 * Put on the element that holds the rows: the wide row's columns, from the
 * tracks the grid-token test pins (`FOLLOWUP_GRID_TRACKS`).
 */
export const FOLLOWUP_ROWS_STYLE = { '--followup-cols': FOLLOWUP_ROW_TEMPLATE } as CSSProperties;

const WIDE = '@[960px]:col-auto @[960px]:row-auto';
const CELL = {
  tick: `col-start-1 row-start-1 ${WIDE}`,
  due: `col-span-2 col-start-2 row-start-2 ${WIDE}`,
  who: `col-start-2 row-start-1 ${WIDE}`,
  temperature: `col-start-3 row-start-3 ${WIDE}`,
  subject: `col-start-2 row-start-3 ${WIDE}`,
  owner: `col-span-2 col-start-2 row-start-4 ${WIDE}`,
  actions: `col-start-3 row-start-1 ${WIDE}`,
} as const;

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

/** Line 1 of the who cell. Soft-deleted customers come back null. */
const customerName = (followup: FollowupResponse): string => {
  if (!followup.customer) return 'Deleted customer';
  return (
    [followup.customer.firstName, followup.customer.lastName].filter(Boolean).join(' ').trim() ||
    'Unnamed customer'
  );
};

/** Line 2: which site, or that it is a customer-level lead. */
const siteLine = (followup: FollowupResponse): string => {
  if (!followup.propertyId) return 'Customer lead';
  if (!followup.property) return 'Deleted site';
  return (
    [followup.property.propertyName?.trim(), followup.property.city?.trim()]
      .filter(Boolean)
      .join(' · ') || 'Unnamed site'
  );
};

const ownerName = (followup: FollowupResponse): string | null =>
  [followup.assignedToUser?.firstName, followup.assignedToUser?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim() || null;

export interface FollowupRowProps {
  followup: FollowupResponse;
  index: number;
  /** True only while the list makes its first entrance. */
  entering: boolean;
  /** Its tick box is ticked. */
  ticked: boolean;
  onTick: (followup: FollowupResponse, ticked: boolean) => void;
  onViewDetails: (followup: FollowupResponse) => void;
  onComplete: (followup: FollowupResponse) => void;
  onReschedule: (followup: FollowupResponse) => void;
  onReassign: (followup: FollowupResponse) => void;
  onCancel: (followup: FollowupResponse) => void;
}

/**
 * One follow-up, one line: when it is due, whose lead it is, how warm, what is
 * to be done, and who owes it. The row opens the lead on its follow-ups; a
 * follow-up whose customer or site is gone opens its own details instead.
 */
function FollowupRowInner({
  followup,
  index,
  entering,
  ticked,
  onTick,
  onViewDetails,
  onComplete,
  onReschedule,
  onReassign,
  onCancel,
}: FollowupRowProps): JSX.Element {
  const name = customerName(followup);
  const site = siteLine(followup);
  const owner = ownerName(followup);
  const recordHref = followupRecordHref(followup);
  const openHref = followupRecordHref(followup, { followupId: followup.id });
  const temperature = followup.property?.leadTemperature as LeadTemperature | undefined;
  // Finished work is never "late" — show when it happened, not a countdown.
  const due =
    followup.status === FollowupStatus.PENDING
      ? dueLabel(followup.scheduledAt)
      : {
          text: formatFollowupWhen(followup.scheduledAt),
          tone: (followup.status === FollowupStatus.COMPLETED ? 'success' : 'neutral') as CrmTone,
        };

  return (
    <CalmRow
      rowId={followup.id}
      className={ROW_GRID}
      label={`Open the follow-up for ${name}: ${followup.subject}`}
      href={openHref ?? undefined}
      onOpen={openHref ? undefined : () => onViewDetails(followup)}
      index={index}
      entering={entering}
      selected={ticked}
    >
      {/* Tick */}
      <div className={cn(CELL.tick, ABOVE, '-ml-2')} onClick={stopRowClick}>
        <Checkbox
          size="small"
          checked={ticked}
          onChange={(event) => onTick(followup, event.target.checked)}
          slotProps={{ input: { 'aria-label': `Select the follow-up for ${name}` } }}
        />
      </div>

      {/* Due */}
      <div className={cn(CELL.due, ABOVE, 'min-w-0')}>
        <CrmStatusPill label={due.text} tone={due.tone} size="sm" />
      </div>

      {/* Who */}
      <div className={cn(CELL.who, ABOVE, 'min-w-0')}>
        {recordHref ? (
          <Link
            href={recordHref}
            prefetch={false}
            onClick={stopRowClick}
            title={name}
            className="block truncate text-[16px] font-semibold tracking-[-0.01em] text-foreground hover:text-primary-dark"
          >
            {name}
          </Link>
        ) : (
          <div title={name} className="truncate text-[16px] font-semibold tracking-[-0.01em]">
            {name}
          </div>
        )}
        <div title={site} className="truncate text-[13px] text-foreground-secondary">
          {site}
        </div>
      </div>

      {/* Temperature */}
      <div className={cn(CELL.temperature, ABOVE, 'min-w-0')}>
        {temperature ? (
          <CrmStatusPill
            label={temperature.charAt(0).toUpperCase() + temperature.slice(1)}
            tone={TEMPERATURE_TONE[temperature] ?? 'neutral'}
            size="sm"
          />
        ) : null}
      </div>

      {/* Subject */}
      <div
        title={followup.subject}
        className={cn(CELL.subject, ABOVE, 'min-w-0 truncate text-[14px]')}
      >
        {followup.subject}
      </div>

      {/* Owner */}
      <div
        title={owner ? `Owner: ${owner}` : undefined}
        className={cn(
          CELL.owner,
          ABOVE,
          'min-w-0 truncate text-[14px]',
          owner ? 'text-foreground-secondary' : 'text-error',
        )}
      >
        {owner ?? 'Unassigned'}
      </div>

      {/* Complete · ⋮ — the shared row actions stop the row click themselves. */}
      <div className={cn(CELL.actions, ABOVE, 'flex justify-end')}>
        <FollowupRowActions
          followup={followup}
          onViewDetails={onViewDetails}
          onComplete={onComplete}
          onReschedule={onReschedule}
          onReassign={onReassign}
          onCancel={onCancel}
        />
      </div>
    </CalmRow>
  );
}

export const FollowupRow = memo(FollowupRowInner);

/** One placeholder shaped like a follow-up row, so nothing jumps when data lands. */
export function FollowupRowSkeleton(): JSX.Element {
  return (
    <div className={cn(ROW_GRID, SKELETON_CARD)}>
      <div className={CELL.tick}>
        <span className={cn(BONE, 'block size-5')} />
      </div>
      <div className={CELL.due}>
        <span className={cn(BONE, 'block h-5 w-28')} />
      </div>
      <div className={cn(CELL.who, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-4 w-3/5')} />
        <span className={cn(BONE, 'h-3 w-4/5')} />
      </div>
      <div className={CELL.temperature}>
        <span className={cn(BONE, 'block h-5 w-12')} />
      </div>
      <div className={CELL.subject}>
        <span className={cn(BONE, 'block h-3.5 w-4/5')} />
      </div>
      <div className={CELL.owner}>
        <span className={cn(BONE, 'block h-3.5 w-2/3')} />
      </div>
      <div className={cn(CELL.actions, 'flex justify-end gap-1.5')}>
        <span className={cn(BONE, 'h-7 w-24')} />
        <span className={cn(BONE, 'size-7')} />
      </div>
    </div>
  );
}

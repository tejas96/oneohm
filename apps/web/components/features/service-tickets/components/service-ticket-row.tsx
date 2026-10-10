'use client';

import { ServiceTicketPriority } from '@tejas96/shared/types';
import NextLink from 'next/link';
import { type JSX, memo } from 'react';

import {
  isTicketOverdue,
  LIVE_TICKET_STATUSES,
  SERVICE_TICKET_PRIORITY_LABELS,
  SERVICE_TICKET_STATUS_LABELS,
  SERVICE_TICKET_STATUS_TONE,
} from '../constants';
import type { ServiceTicket } from '../hooks/use-service-tickets';

import {
  ABOVE,
  BONE,
  CalmRow,
  QuietPill,
  SKELETON_CARD,
  stopRowClick,
} from '@/components/shared/calm-list';
import type { CrmTone } from '@/components/shared/crm-table';
import { MUIAvatar } from '@/components/ui/mui-avatar';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { cn, formatBusinessDate, formatDate, formatDueDatePendingLabel } from '@/lib/utils';

/**
 * Wide: what · project · assignee · due · raised on one line. The project
 * track holds a 24-character number (`PRJ-ONEOHM_EPC-2026-0220`) unclipped:
 * its last digits are the part that tells two projects apart.
 *
 * Narrow (the list itself under 960px, so an open side panel counts): what,
 * then project beside the due date, then assignee beside the raised date.
 * Phone (under 460px): the project number needs the whole line, so it gets
 * one; the due date moves beside the assignee and the raised date goes last.
 */
const ROW_GRID =
  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 @[960px]:grid-cols-[minmax(0,2fr)_208px_minmax(0,1fr)_112px_128px] @[960px]:gap-5';

const WIDE = '@[960px]:col-auto @[960px]:row-auto @[960px]:text-left';
const CELL = {
  what: `col-span-2 col-start-1 row-start-1 ${WIDE}`,
  project: `col-span-2 col-start-1 row-start-2 @[460px]:col-span-1 ${WIDE}`,
  due: `col-start-2 row-start-3 text-right @[460px]:row-start-2 ${WIDE}`,
  assignee: `col-start-1 row-start-3 ${WIDE}`,
  raised: `col-span-2 col-start-1 row-start-4 @[460px]:col-span-1 @[460px]:col-start-2 @[460px]:row-start-3 @[460px]:text-right ${WIDE}`,
} as const;

/** A cell is two lines on one rhythm: a fact over a note. */
const FACT = 'block truncate text-[14px] text-foreground';
const NOTE = 'block truncate text-[12px] text-foreground-tertiary';
/** A fact with nothing to report: never as dark as a real value. */
const FACT_EMPTY = 'block truncate text-[14px] text-foreground-muted';

/** Only a priority that asks for something gets a colour; the usual ones stay grey. */
const PRIORITY_TONE: Record<ServiceTicketPriority, CrmTone> = {
  [ServiceTicketPriority.LOW]: 'neutral',
  [ServiceTicketPriority.MEDIUM]: 'neutral',
  [ServiceTicketPriority.HIGH]: 'warning',
  [ServiceTicketPriority.URGENT]: 'danger',
};

export interface ServiceTicketRowProps {
  ticket: ServiceTicket;
  index: number;
  /** True only while the list makes its first entrance. */
  entering: boolean;
}

/**
 * One ticket, one line, each cell answering one question: what is wrong and
 * for whom, on which project, who has it, when it is due, and who raised it.
 */
function ServiceTicketRowInner({ ticket, index, entering }: ServiceTicketRowProps): JSX.Element {
  const overdue = isTicketOverdue(ticket);
  const live = LIVE_TICKET_STATUSES.includes(ticket.status);

  return (
    <CalmRow
      rowId={ticket.id}
      className={ROW_GRID}
      label={`Open ticket ${ticket.ticketNumber}: ${ticket.title}`}
      href={buildRoute(ROUTES.SERVICE.DETAIL, { id: ticket.id })}
      index={index}
      entering={entering}
    >
      {/* What */}
      <div className={cn(CELL.what, ABOVE, 'min-w-0')}>
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            title={ticket.title}
            className="min-w-0 shrink truncate text-[16px] font-semibold tracking-[-0.01em]"
          >
            {ticket.title}
          </span>
          <QuietPill
            label={SERVICE_TICKET_STATUS_LABELS[ticket.status]}
            tone={SERVICE_TICKET_STATUS_TONE[ticket.status]}
            whole
          />
          <QuietPill
            label={SERVICE_TICKET_PRIORITY_LABELS[ticket.priority]}
            tone={PRIORITY_TONE[ticket.priority]}
            whole
          />
        </div>
        <div
          title={[ticket.ticketNumber, ticket.customerName].filter(Boolean).join(' · ')}
          className="truncate text-[13px] text-foreground-secondary"
        >
          <span className="tabular-nums">{ticket.ticketNumber}</span>
          {ticket.customerName ? ` · ${ticket.customerName}` : ''}
        </div>
      </div>

      {/* Project */}
      <div className={cn(CELL.project, ABOVE, 'min-w-0')}>
        <NextLink
          href={buildRoute(ROUTES.PROJECTS.DETAIL, { id: ticket.projectId })}
          prefetch={false}
          onClick={stopRowClick}
          // The project's name is not in the list payload, so the number is the fullest label there is.
          title={`Open project ${ticket.projectNumber}`}
          className="block truncate text-[14px] tabular-nums text-foreground hover:text-primary-dark hover:underline"
        >
          {ticket.projectNumber}
        </NextLink>
        <span className={NOTE}>Project</span>
      </div>

      {/* Assignee */}
      <div className={cn(CELL.assignee, ABOVE, 'flex min-w-0 items-center gap-2')}>
        {ticket.assigneeName ? (
          <>
            <MUIAvatar name={ticket.assigneeName} size="sm" aria-hidden sx={{ flexShrink: 0 }} />
            <span className={FACT} title={`Assigned to ${ticket.assigneeName}`}>
              {ticket.assigneeName}
            </span>
          </>
        ) : (
          // Nobody on live work is a problem; nobody on finished work is not.
          <span className={live ? 'block truncate text-[14px] text-error' : FACT_EMPTY}>
            Unassigned
          </span>
        )}
      </div>

      {/* Due */}
      <div className={cn(CELL.due, ABOVE, 'min-w-0')}>
        {ticket.dueDate ? (
          <>
            <span className={cn(FACT, 'tabular-nums')}>{formatBusinessDate(ticket.dueDate)}</span>
            {/* A countdown only while there is work left: finished work is never "late". */}
            <span
              className={cn(
                'block truncate text-[12px] tabular-nums',
                overdue ? 'text-error' : 'text-foreground-tertiary',
              )}
            >
              {live ? formatDueDatePendingLabel(ticket.dueDate) : 'Due date'}
            </span>
          </>
        ) : (
          <span className={FACT_EMPTY}>No due date</span>
        )}
      </div>

      {/* Raised */}
      <div className={cn(CELL.raised, ABOVE, 'min-w-0')}>
        <span className={cn(FACT, 'tabular-nums')}>{formatDate(ticket.createdAt)}</span>
        <span
          className={NOTE}
          title={ticket.createdByName ? `Raised by ${ticket.createdByName}` : undefined}
        >
          {ticket.createdByName ? `by ${ticket.createdByName}` : 'Raised'}
        </span>
      </div>
    </CalmRow>
  );
}

export const ServiceTicketRow = memo(ServiceTicketRowInner);

/** One placeholder shaped like a ticket row, so nothing jumps when data lands. */
export function ServiceTicketRowSkeleton(): JSX.Element {
  return (
    <div className={cn(ROW_GRID, SKELETON_CARD)}>
      <div className={cn(CELL.what, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-4 w-3/5')} />
        <span className={cn(BONE, 'h-3 w-4/5')} />
      </div>
      <div className={cn(CELL.project, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-3.5 w-40')} />
        <span className={cn(BONE, 'h-3 w-12')} />
      </div>
      <div className={cn(CELL.assignee, 'flex items-center gap-2')}>
        <span className={cn(BONE, 'size-6 flex-none')} />
        <span className={cn(BONE, 'h-3.5 w-24')} />
      </div>
      <div className={cn(CELL.due, 'flex flex-col items-end gap-2 @[960px]:items-start')}>
        <span className={cn(BONE, 'h-3.5 w-20')} />
        <span className={cn(BONE, 'h-3 w-10')} />
      </div>
      <div
        className={cn(CELL.raised, 'flex flex-col gap-2 @[460px]:items-end @[960px]:items-start')}
      >
        <span className={cn(BONE, 'h-3.5 w-20')} />
        <span className={cn(BONE, 'h-3 w-16')} />
      </div>
    </div>
  );
}

'use client';

import { CustomerStatus } from '@tejas96/shared/types';
import Link from 'next/link';
import { type JSX, type KeyboardEvent, type MouseEvent, memo } from 'react';

import { AddSiteLink } from './add-site-link';
import { FollowUpCell } from './follow-up-cell';
import { fullName, groupLabel, journeySummary, metaLine, shortDay } from './format';
import { TicketIcon } from './icons';
import { JourneyTrack } from './journey-track';
import { customerLinks } from './links';
import { RowActionsMenu } from './row-actions-menu';
import { ROW_CELL, ROW_GRID } from './row-layout';
import type { Customer } from '../../hooks/use-customers';

import { MUIAvatar } from '@/components/ui/mui-avatar';
import { cn, formatCurrency, toTitleLabel } from '@/lib/utils';

/** Rows rise in 55ms apart, the first time the list paints. */
const STAGGER_MS = 55;

const TAG = 'flex-none rounded-pill px-2 py-0.5 text-[11px] font-medium leading-[13px]';

const stopRowClick = (event: MouseEvent): void => event.stopPropagation();

export interface CustomerRowProps {
  customer: Customer;
  index: number;
  /** True only while the list makes its first entrance. */
  entering: boolean;
  /** Its focus panel is open. */
  selected: boolean;
  /** Looked up from the customer's `resellerId`; undefined when unknown. */
  resellerName?: string;
  showDelete: boolean;
  onOpen: (customer: Customer) => void;
  onRequestDelete: (customer: Customer) => void;
}

function CustomerRowInner({
  customer,
  index,
  entering,
  selected,
  resellerName,
  showDelete,
  onOpen,
  onRequestDelete,
}: CustomerRowProps): JSX.Element {
  const name = fullName(customer);
  const group = groupLabel(customer);
  const meta = metaLine(customer, resellerName);
  const journey = journeySummary(customer);
  const value = customer.sitePortfolio?.totalPortfolioAmount ?? 0;
  const tickets = customer.activeTicketCount ?? 0;
  const amount = value > 0 ? formatCurrency(value) : null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    // Only the row itself: Enter on a link or button inside must do its own job.
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onOpen(customer);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-expanded={selected}
      aria-label={`${name}: open details`}
      data-customer-row={customer.id}
      onClick={() => onOpen(customer)}
      onKeyDown={handleKeyDown}
      style={entering ? { animationDelay: `${index * STAGGER_MS}ms` } : undefined}
      className={cn(
        ROW_GRID,
        'cursor-pointer rounded-rf-xl bg-surface px-5 py-4 shadow-e1',
        'transition-[box-shadow,transform] duration-[250ms] ease-calm hover:-translate-y-0.5 hover:shadow-calm',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        entering && 'animate-calm-rise motion-reduce:animate-none',
        selected && 'shadow-calm ring-2 ring-foreground',
      )}
    >
      {/* Who */}
      <div className={cn(ROW_CELL.who, 'flex min-w-0 items-center gap-3.5')}>
        <MUIAvatar
          name={name}
          size={44}
          aria-hidden
          sx={{ flexShrink: 0, fontSize: 15, fontWeight: 600 }}
        />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href={customerLinks.customer(customer.id)}
              prefetch={false}
              onClick={stopRowClick}
              title={name}
              className="min-w-[6ch] truncate text-[16px] font-semibold tracking-[-0.01em] text-foreground hover:text-primary-dark"
            >
              {name}
            </Link>
            {group ? (
              // Gives way before the name does; the full label is in the title and the panel.
              <span
                title={group}
                className={cn(
                  TAG,
                  'min-w-10 max-w-[104px] shrink-[20] truncate bg-background-tertiary text-foreground-secondary',
                )}
              >
                {customer.groupName || customer.groupCode}
              </span>
            ) : null}
            <span
              className={cn(
                TAG,
                customer.status === CustomerStatus.LOST
                  ? 'bg-[var(--ds-danger-bg)] text-error'
                  : 'bg-background-tertiary text-foreground-secondary',
              )}
            >
              {toTitleLabel(customer.status)}
            </span>
            {tickets > 0 ? (
              <Link
                href={customerLinks.service(customer.id)}
                prefetch={false}
                onClick={stopRowClick}
                title={tickets === 1 ? '1 active ticket' : `${tickets} active tickets`}
                aria-label={tickets === 1 ? '1 active ticket' : `${tickets} active tickets`}
                className="grid size-[22px] flex-none place-items-center rounded-full bg-[var(--ds-warning-bg)] text-[var(--ds-warning)] hover:brightness-95"
              >
                <TicketIcon />
              </Link>
            ) : null}
          </div>
          <div title={meta} className="truncate text-[13px] text-foreground-secondary">
            {meta}
          </div>
        </div>
      </div>

      {/* Journey */}
      <div className={cn(ROW_CELL.journey, 'min-w-0')}>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <b className="flex-none text-[14px] font-semibold">{journey.title}</b>
          {journey.kind === 'none' ? (
            <AddSiteLink customerId={customer.id} className="flex-none text-[12px]" />
          ) : (
            <span
              title={journey.detail ?? undefined}
              className="min-w-0 truncate text-[12px] text-foreground-muted"
            >
              {journey.detail}
            </span>
          )}
        </div>
        <JourneyTrack
          stageIndex={journey.stageIndex}
          lost={journey.kind === 'lost'}
          hasSite={journey.kind !== 'none'}
          animateIn={entering}
        />
      </div>

      {/* Follow-up */}
      <FollowUpCell customer={customer} className={ROW_CELL.next} />

      {/* Value */}
      <div className={cn(ROW_CELL.value, 'flex flex-col items-end whitespace-nowrap text-right')}>
        {amount ? (
          <Link
            href={customerLinks.quotes(customer.id)}
            prefetch={false}
            onClick={stopRowClick}
            title={`${amount} across this customer's sites — open quotes`}
            className={cn(
              'font-semibold tabular-nums text-foreground hover:text-primary-dark hover:underline',
              // A crore-plus figure would run into the follow-up cell at full size.
              amount.length > 12 ? 'text-[14px]' : 'text-[16px]',
            )}
          >
            {amount}
          </Link>
        ) : (
          <span className="text-[13px] text-foreground-muted">Not quoted yet</span>
        )}
        <small className="block text-[12px] font-normal text-foreground-muted">
          added {shortDay(customer.createdAt)}
        </small>
      </div>

      {/* ⋮ — a plain wrapper so a click on the menu or its backdrop never opens the panel. */}
      <div className={cn(ROW_CELL.actions, 'flex justify-end')} onClick={stopRowClick}>
        <RowActionsMenu
          customer={customer}
          showDelete={showDelete}
          onRequestDelete={onRequestDelete}
        />
      </div>
    </div>
  );
}

export const CustomerRow = memo(CustomerRowInner);

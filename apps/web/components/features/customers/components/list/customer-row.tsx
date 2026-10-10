'use client';

import { CustomerStatus } from '@tejas96/shared/types';
import Link from 'next/link';
import { type JSX, type MouseEvent, memo, useRef } from 'react';

import { AddSiteButton } from './add-site-button';
import { FollowUpCell } from './follow-up-cell';
import {
  followupText,
  fullName,
  groupLabel,
  handledBy,
  journeyAltText,
  journeySummary,
  metaLine,
  shortDay,
} from './format';
import { TicketIcon } from './icons';
import { JourneyTrack } from './journey-track';
import { customerLinks } from './links';
import { RowActionsMenu } from './row-actions-menu';
import { MAX_STAGGER_STEPS, ROW_CELL, ROW_GRID, STAGGER_MS } from './row-layout';
import type { Customer } from '../../hooks/use-customers';

import { MUIAvatar } from '@/components/ui/mui-avatar';
import { cn, formatCurrency, toTitleLabel } from '@/lib/utils';

/** A tag after the name. */
const TAG =
  'truncate rounded-pill px-2 py-0.5 text-[11px] font-medium leading-[13px] text-foreground-secondary';

/**
 * How a tag takes its width. The name gets the room first: it sits at its own
 * width, and the tags start from nothing and grow into what is left, up to
 * their own text. Only when even their minimum does not fit does the name
 * itself shrink. (Shrinking everything in proportion instead shaves a pixel
 * off a name that would have fitted and puts an ellipsis on it.)
 */
const TAG_FIT = 'max-w-max basis-0';

/** Everything in a cell sits above the row's cover button. */
const ABOVE = 'relative z-[1]';

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

/**
 * One customer, one line.
 *
 * The row is a plain container, not a `role="button"` wrapping links — that
 * hides the links inside from a screen reader. Instead a real button covers the
 * row ("open details", first in tab order) and the name, ticket, follow-up,
 * value and ⋮ sit above it as ordinary links and buttons. A click on any plain
 * part of the row opens the panel too, and moves focus to that button so it
 * has somewhere to return to when the panel closes.
 */
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
  const openButton = useRef<HTMLButtonElement>(null);
  const name = fullName(customer);
  const group = groupLabel(customer);
  const meta = metaLine(customer, resellerName);
  const journey = journeySummary(customer);
  const followup = followupText(customer);
  const handler = handledBy(customer);
  const status = toTitleLabel(customer.status);
  const value = customer.sitePortfolio?.totalPortfolioAmount ?? 0;
  const tickets = customer.activeTicketCount ?? 0;
  const amount = value > 0 ? formatCurrency(value) : null;

  const hasSite = journey.kind === 'live' || journey.kind === 'lost';
  const stage = journeyAltText(
    journey.stageIndex,
    journey.kind === 'lost',
    hasSite,
    journey.kind !== 'unknown',
  );
  const followupSpoken = [followup.title, followup.sub].filter(Boolean).join(', ');

  const open = (): void => {
    openButton.current?.focus({ preventScroll: true });
    onOpen(customer);
  };

  return (
    // The cover button below is the keyboard and screen-reader path; this
    // handler only lets a mouse click on the text between the links do the same.
    <div
      data-customer-row={customer.id}
      onClick={open}
      style={
        entering
          ? { animationDelay: `${Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS}ms` }
          : undefined
      }
      className={cn(
        ROW_GRID,
        'relative cursor-pointer rounded-rf-xl bg-surface px-5 py-4 shadow-e1',
        'transition-[box-shadow,transform] duration-[250ms] ease-calm hover:-translate-y-0.5 hover:shadow-calm',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        entering && 'animate-calm-rise motion-reduce:animate-none',
        selected && 'shadow-calm ring-2 ring-foreground',
      )}
    >
      <button
        ref={openButton}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={selected}
        aria-label={`Open details: ${name}. ${stage}. ${followupSpoken}`}
        onClick={(event) => {
          event.stopPropagation();
          onOpen(customer);
        }}
        className="absolute inset-0 z-0 cursor-pointer rounded-rf-xl"
      />

      {/* Who */}
      <div className={cn(ROW_CELL.who, ABOVE, 'flex min-w-0 items-center gap-3.5')}>
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
              className="min-w-[9ch] shrink truncate text-[16px] font-semibold tracking-[-0.01em] text-foreground hover:text-primary-dark"
            >
              {name}
            </Link>
            {group ? (
              <span title={group} className={cn(TAG_FIT, 'flex min-w-7 grow')}>
                <span className={cn(TAG, 'block max-w-[96px] bg-background-tertiary')}>
                  {customer.groupName || customer.groupCode}
                </span>
              </span>
            ) : null}
            <span
              title={`Status: ${status}`}
              className={cn(
                TAG,
                TAG_FIT,
                'min-w-8 grow-[2]',
                customer.status === CustomerStatus.LOST
                  ? 'bg-[var(--ds-danger-bg)] text-error'
                  : 'bg-background-tertiary',
              )}
            >
              {status}
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
      <div className={cn(ROW_CELL.journey, ABOVE, 'min-w-0')}>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          {/* Keeps its line when there is no stage to name, so the track stays put. */}
          <b className="min-h-[1.45em] flex-none text-[14px] font-semibold">{journey.title}</b>
          {journey.kind === 'none' ? (
            <AddSiteButton customerId={customer.id} className="flex-none text-[12px]" />
          ) : journey.kind === 'unknown' ? null : (
            <span
              title={journey.detail ?? undefined}
              className="min-w-0 truncate text-[12px] text-foreground-tertiary"
            >
              {journey.detail}
            </span>
          )}
        </div>
        <JourneyTrack
          stageIndex={journey.stageIndex}
          lost={journey.kind === 'lost'}
          hasSite={hasSite}
          known={journey.kind !== 'unknown'}
          animateIn={entering}
        />
      </div>

      {/* Follow-up */}
      <FollowUpCell customer={customer} className={cn(ROW_CELL.next, ABOVE)} />

      {/* Value */}
      <div
        className={cn(
          ROW_CELL.value,
          ABOVE,
          'flex flex-col items-end whitespace-nowrap text-right',
        )}
      >
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
          <span className="text-[13px] text-foreground-tertiary">Not quoted yet</span>
        )}
        <small className="block text-[12px] font-normal text-foreground-tertiary">
          added {shortDay(customer.createdAt)}
        </small>
      </div>

      {/* Handled by · ⋮ */}
      <div className={cn(ROW_CELL.actions, ABOVE, 'flex items-center justify-end gap-1.5')}>
        {handler.name ? (
          <span
            role="img"
            aria-label={handler.title}
            title={handler.title}
            className={cn('flex-none', handler.archived && 'opacity-55 grayscale')}
          >
            <MUIAvatar name={handler.name} size={28} aria-hidden />
          </span>
        ) : (
          <span
            role="img"
            aria-label={handler.title}
            title={handler.title}
            className="block size-7 flex-none rounded-full border-[1.5px] border-dashed border-gray-300"
          />
        )}
        {/* A click on the menu, or on the backdrop that closes it, never opens the panel. */}
        <div onClick={stopRowClick}>
          <RowActionsMenu
            customer={customer}
            showDelete={showDelete}
            onRequestDelete={onRequestDelete}
          />
        </div>
      </div>
    </div>
  );
}

export const CustomerRow = memo(CustomerRowInner);

'use client';

import { Drawer } from '@mui/material';
import { CustomerStatus } from '@tejas96/shared/types';
import { formatPhoneForDisplay } from '@tejas96/shared/utils';
import Link from 'next/link';
import { type CSSProperties, type JSX, type ReactNode, useId, useRef } from 'react';

import {
  firstName,
  followupDue,
  followupTypeLabel,
  fullName,
  groupLabel,
  handledBy,
  journeySummary,
  metaLine,
  shortDay,
} from './format';
import { CalendarIcon, CloseIcon, PhoneIcon } from './icons';
import { JourneySteps } from './journey-steps';
import { customerLinks } from './links';
import { PanelSites } from './panel-sites';
import type { Customer, FollowupAssignee } from '../../hooks/use-customers';

import { usePrefersReducedMotion } from '@/components/features/dashboard/kit';
import { MUIAvatar } from '@/components/ui/mui-avatar';
import { ease, shadow } from '@/lib/theme/tokens';
import { cn, formatCurrency, formatDate, toTitleLabel } from '@/lib/utils';

const SLIDE_MS = 500;
const SHADE_MS = 350;

const HEADING =
  'm-0 mb-3 text-[12px] font-medium uppercase tracking-[0.04em] text-foreground-tertiary';
const TAG = 'flex-none rounded-pill px-2 py-0.5 text-[11px] font-medium leading-[13px]';
const QUICK =
  'flex min-w-0 flex-col items-start gap-1.5 rounded-input-expressive bg-surface p-3.5 text-left shadow-e1 transition-transform duration-200 ease-calm hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0';

/** A white card that rises in a beat after the panel does. */
function Card({
  delayMs,
  children,
  labelledBy,
}: {
  delayMs: number;
  children: ReactNode;
  labelledBy?: string;
}): JSX.Element {
  return (
    <section
      aria-labelledby={labelledBy}
      style={{ animationDelay: `${delayMs}ms`, '--calm-rise-y': '8px' } as CSSProperties}
      className="mb-3 animate-calm-rise rounded-rf-xl bg-surface p-[18px] shadow-e1 [animation-duration:500ms] motion-reduce:animate-none"
    >
      {children}
    </section>
  );
}

/** Solid: still owes work. Dimmed: only closed the last follow-up. */
function FollowupPeople({ people }: { people: FollowupAssignee[] }): JSX.Element {
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1.5">
      {people.map((person) => {
        const name = [person.firstName, person.lastName].filter(Boolean).join(' ');
        return (
          <span
            key={person.userId}
            title={person.live ? `${name} — owes work` : `${name} — handled it last`}
            className={cn('flex items-center gap-1.5', !person.live && 'opacity-55 grayscale')}
          >
            <MUIAvatar name={name} size={20} aria-hidden />
            <span>
              {person.firstName}
              {person.live ? null : (
                <span className="text-foreground-tertiary"> · handled it last</span>
              )}
            </span>
          </span>
        );
      })}
    </span>
  );
}

function PanelBody({
  customer,
  resellerName,
  titleId,
  onClose,
}: {
  customer: Customer;
  resellerName?: string;
  titleId: string;
  onClose: () => void;
}): JSX.Element {
  const standsId = useId();
  const detailsId = useId();
  const name = fullName(customer);
  const group = groupLabel(customer);
  const journey = journeySummary(customer);
  const handler = handledBy(customer);
  const next = customer.nextFollowup ?? null;
  const due = next ? followupDue(next.scheduledAt) : null;
  const value = customer.sitePortfolio?.totalPortfolioAmount ?? 0;
  const tickets = customer.activeTicketCount ?? 0;
  const people = customer.followupAssignees ?? [];
  const phone = customer.phone || customer.alternatePhone;
  const otherPhone = customer.phone && customer.alternatePhone ? customer.alternatePhone : null;

  return (
    <>
      <div className="flex items-center gap-4">
        <MUIAvatar
          name={name}
          size={60}
          aria-hidden
          sx={{ flexShrink: 0, fontSize: 20, fontWeight: 600 }}
        />
        <div className="min-w-0 flex-1">
          <h2
            id={titleId}
            className="m-0 text-[22px] font-semibold leading-[1.3] tracking-[-0.02em]"
          >
            <Link
              href={customerLinks.customer(customer.id)}
              prefetch={false}
              title={name}
              className="line-clamp-2 text-foreground [overflow-wrap:anywhere] hover:text-primary-dark"
            >
              {name}
            </Link>
          </h2>
          <div
            title={metaLine(customer, resellerName)}
            className="truncate text-[13px] text-foreground-secondary"
          >
            {metaLine(customer, resellerName)}
          </div>
          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
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
            {group ? (
              <span
                title={group}
                className={cn(
                  TAG,
                  'min-w-0 shrink truncate bg-background-tertiary text-foreground-secondary',
                )}
              >
                {group}
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="grid size-9 flex-none place-items-center rounded-full text-foreground-secondary hover:bg-background-tertiary"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="my-[22px] grid grid-cols-2 gap-2.5">
        {phone ? (
          <a href={customerLinks.call(phone)} className={QUICK}>
            <PhoneIcon />
            <b className="max-w-full truncate font-semibold tabular-nums">
              {formatPhoneForDisplay(phone)}
            </b>
            <span className="text-[12px] text-foreground-secondary">Call</span>
          </a>
        ) : (
          <div className={cn(QUICK, 'text-foreground-tertiary hover:translate-y-0')}>
            <PhoneIcon />
            <b className="font-semibold">No phone</b>
            <span className="text-[12px]">Nothing to call</span>
          </div>
        )}
        <Link href={customerLinks.followups(customer.id)} prefetch={false} className={QUICK}>
          <CalendarIcon />
          <b
            className={cn(
              'max-w-full truncate font-semibold',
              due?.kind === 'overdue' && 'text-error',
            )}
          >
            {next ? shortDay(next.scheduledAt) : 'Plan'}
          </b>
          <span className="max-w-full truncate text-[12px] text-foreground-secondary">
            {next && due
              ? [
                  followupTypeLabel(next),
                  next.assigneeName ? firstName(next.assigneeName) : null,
                  due.label,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : 'Add a follow-up'}
          </span>
        </Link>
        {otherPhone ? (
          <a
            href={customerLinks.call(otherPhone)}
            className="col-span-2 -mt-1 px-1 text-[12px] text-foreground-secondary hover:underline"
          >
            Other number: <span className="tabular-nums">{formatPhoneForDisplay(otherPhone)}</span>
          </a>
        ) : null}
      </div>

      <Card delayMs={80} labelledBy={standsId}>
        <h3 id={standsId} className={HEADING}>
          Where it stands
        </h3>
        {journey.kind === 'lost' ? (
          <p className="-mt-1 mb-3 text-[13px] text-error">Lost — {journey.detail}</p>
        ) : null}
        {journey.kind === 'none' ? (
          <p className="-mt-1 mb-3 text-[13px] text-foreground-secondary">
            No site yet — the journey starts with the first one.
          </p>
        ) : null}
        {journey.scope ? (
          <p className="-mt-1 mb-3 text-[13px] text-foreground-secondary">{journey.scope}</p>
        ) : null}
        {journey.kind === 'unknown' ? (
          <p className="-mt-1 mb-0 text-[13px] text-foreground-secondary">
            The stage is not available right now. The sites below show where each one stands.
          </p>
        ) : (
          <JourneySteps
            stageIndex={journey.stageIndex}
            lost={journey.kind === 'lost'}
            hasSite={journey.kind !== 'none'}
            steps={customer.journey?.steps}
          />
        )}
      </Card>

      <Card delayMs={160}>
        <PanelSites
          customerId={customer.id}
          expectedSiteCount={customer.journey?.siteCount ?? customer.propertyCount ?? 0}
        />
      </Card>

      <Card delayMs={240} labelledBy={detailsId}>
        <h3 id={detailsId} className={HEADING}>
          Details
        </h3>
        <dl className="m-0 grid grid-cols-[120px_minmax(0,1fr)] gap-y-2 text-[14px] [&_dd]:m-0 [&_dd]:font-medium [&_dt]:text-foreground-tertiary">
          <dt>Handled by</dt>
          <dd className={cn(!handler.label && 'text-foreground-secondary')}>
            {handler.label ?? (customer.assigneeId ? handler.title : 'Not assigned')}
          </dd>
          <dt>Created by</dt>
          <dd>
            {customer.creatorName === 'Self' ? 'Self-registered' : (customer.creatorName ?? '—')}
          </dd>
          <dt>Onboarded</dt>
          <dd>{formatDate(customer.createdAt)}</dd>
          <dt>Value</dt>
          <dd className={cn(value <= 0 && 'text-foreground-secondary')}>
            {value > 0 ? formatCurrency(value) : 'Not quoted yet'}
          </dd>
          {people.length > 0 ? (
            <>
              <dt>Follow-ups by</dt>
              <dd>
                <FollowupPeople people={people} />
              </dd>
            </>
          ) : null}
          {tickets > 0 ? (
            <>
              <dt>Service</dt>
              <dd>
                <Link
                  href={customerLinks.service(customer.id)}
                  prefetch={false}
                  className="text-[var(--ds-warning)] hover:underline"
                >
                  {tickets === 1 ? '1 active ticket' : `${tickets} active tickets`}
                </Link>
              </dd>
            </>
          ) : null}
        </dl>
      </Card>

      <Link
        href={customerLinks.customer(customer.id)}
        prefetch={false}
        className="mt-1.5 block rounded-pill bg-primary px-[18px] py-2.5 text-center text-[14px] font-medium text-white shadow-calm-cta transition-transform duration-200 ease-calm hover:-translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        Open full customer page
      </Link>
    </>
  );
}

export interface FocusPanelProps {
  /** The customer to show; null closes the panel. */
  customer: Customer | null;
  /** Reseller names by `resellerId`, for the "Reseller · <name>" source. */
  resellerNames: ReadonlyMap<string, string>;
  onClose: () => void;
}

/**
 * The right-hand panel a row opens: who it is, where it stands, its sites and
 * the details. Replaces the table that used to expand under a row.
 *
 * A MUI Drawer for what it gets right for free — focus moves in and is held,
 * Esc and the shade close it, focus goes back to the row that opened it, and
 * the menus and dialogs opened from inside stack above it. Only its look is
 * ours. The URL does not change.
 */
export function FocusPanel({ customer, resellerNames, onClose }: FocusPanelProps): JSX.Element {
  const titleId = useId();
  const reduced = usePrefersReducedMotion();

  // Keep the last customer on screen while the panel slides away.
  const last = useRef<Customer | null>(customer);
  if (customer) last.current = customer;
  const shown = customer ?? last.current;
  const resellerName = shown?.resellerId ? resellerNames.get(shown.resellerId) : undefined;

  return (
    <Drawer
      anchor="right"
      open={Boolean(customer)}
      onClose={onClose}
      transitionDuration={reduced ? 0 : { enter: SLIDE_MS, exit: SHADE_MS }}
      slotProps={{
        transition: { easing: { enter: ease.calm, exit: ease.calm } },
        backdrop: {
          transitionDuration: reduced ? 0 : SHADE_MS,
          sx: {
            // The approved design dims the page; the app's default veil is a white blur.
            backgroundColor: 'color-mix(in srgb, var(--ds-text-primary) 28%, transparent)',
            backdropFilter: 'none',
          },
        },
        paper: {
          role: 'dialog',
          'aria-modal': true,
          'aria-labelledby': titleId,
          sx: {
            width: { xs: '100%', sm: 520 },
            maxWidth: '100%',
            backgroundColor: 'var(--ds-canvas)',
            backgroundImage: 'none',
            borderRadius: 0,
            boxShadow: shadow['calm-drawer'],
            padding: { xs: '20px', sm: '28px' },
            fontSize: 14,
            lineHeight: 1.45,
            color: 'var(--ds-text-primary)',
          },
        },
      }}
    >
      {shown ? (
        <PanelBody
          key={shown.id}
          customer={shown}
          resellerName={resellerName}
          titleId={titleId}
          onClose={onClose}
        />
      ) : null}
    </Drawer>
  );
}

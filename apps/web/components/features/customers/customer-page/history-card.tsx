'use client';

import { bankLabel } from '@tejas96/shared/constants';
import { FollowupStatus, ProjectStatus } from '@tejas96/shared/types';
import NextLink from 'next/link';
import { type JSX, useMemo, useState } from 'react';

import type {
  Customer,
  CustomerLoanApplication,
  CustomerProjectItem,
  CustomerPropertyResponse,
  CustomerQuote,
} from '../hooks';
import { siteClosed } from './build-attention';
import { PageCard } from './parts';

import { OUTCOME_LABELS, type FollowupResponse } from '@/components/features/followups';
import { getPropertyDisplayName } from '@/components/features/properties/utils';
import type { ServiceTicket } from '@/components/features/service-tickets/hooks/use-service-tickets';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import type { LedgerEntry } from '@/lib/hooks/resources/ledger';
import {
  cn,
  formatBusinessDate,
  formatCurrency,
  formatDate,
  formatPaymentMethod,
  toTitleLabel,
} from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

type HistoryKind =
  | 'customer'
  | 'site'
  | 'followup'
  | 'quote'
  | 'project'
  | 'money'
  | 'loan'
  | 'service'
  | 'lost';

const KIND_LABEL: Record<HistoryKind, string> = {
  customer: 'Customer',
  site: 'Site',
  followup: 'Follow-ups',
  quote: 'Quotes',
  project: 'Project',
  money: 'Money',
  loan: 'Loan',
  service: 'Service',
  lost: 'Lost',
};

/** The dot's two colours, by kind. */
const KIND_DOT: Record<HistoryKind, string> = {
  customer: 'bg-background-tertiary text-foreground-secondary',
  site: 'bg-background-tertiary text-foreground-secondary',
  followup: 'bg-background-tertiary text-foreground-secondary',
  quote: 'bg-[var(--ds-info-bg)] text-[var(--ds-info)]',
  project: 'bg-[#EDE9FE] text-[#6D28D9]',
  money: 'bg-[var(--ds-success-bg)] text-primary-dark',
  loan: 'bg-[var(--ds-warning-bg)] text-[var(--ds-warning)]',
  service: 'bg-[var(--ds-warning-bg)] text-[var(--ds-warning)]',
  lost: 'bg-[var(--ds-danger-bg)] text-error',
};

export interface HistoryEvent {
  id: string;
  kind: HistoryKind;
  /** ISO date or timestamp of when it happened. */
  at: string;
  /** A day only (a business date): printed without a clock. */
  dayOnly?: boolean;
  title: string;
  detail?: string;
  href?: string;
  followupId?: string;
}

/**
 * Everything the history is built from. A field left `undefined` is one the
 * user may not see: its events are absent.
 */
export interface HistoryFacts {
  customer: Customer;
  sites: CustomerPropertyResponse[];
  followups?: FollowupResponse[];
  quotes?: CustomerQuote[];
  projects?: CustomerProjectItem[];
  receipts?: LedgerEntry[];
  loans?: CustomerLoanApplication[];
  tickets?: ServiceTicket[];
}

/**
 * What happened, newest first.
 *
 * There is no audit log, so this is built from the records themselves and
 * lists only what a record proves: when it was made, when a step was closed,
 * when money came in. A change of status or of owner leaves no record, so it
 * is not here — and the card says so rather than look complete.
 */
export function buildHistory(facts: HistoryFacts): HistoryEvent[] {
  const many = facts.sites.length > 1;
  const events: HistoryEvent[] = [];
  const siteNameById = new Map(facts.sites.map((site) => [site.id, getPropertyDisplayName(site)]));
  const at = (siteId: string | null | undefined, text: string): string => {
    const name = many && siteId ? siteNameById.get(siteId) : null;
    return name ? `${text} · ${name}` : text;
  };

  events.push({
    id: `customer-${facts.customer.id}`,
    kind: 'customer',
    at: facts.customer.createdAt,
    title: 'Customer added',
    detail: `by ${facts.customer.creatorName || 'the customer (self-registered)'}`,
  });

  for (const site of facts.sites) {
    events.push({
      id: `site-${site.id}`,
      kind: 'site',
      at: site.createdAt,
      title: 'Site added',
      detail: at(site.id, site.creatorName ? `by ${site.creatorName}` : 'Created'),
    });
    if (site.siteVisitDone && site.siteVisitCompletedAt) {
      events.push({
        id: `visit-${site.id}`,
        kind: 'site',
        at: site.siteVisitCompletedAt,
        title: 'Site visit completed',
        detail: at(
          site.id,
          site.siteVisitAssigneeName ? `by ${site.siteVisitAssigneeName}` : 'Visit marked complete',
        ),
      });
    }
    if (site.surveyDone && site.siteSurveyCompletedAt) {
      events.push({
        id: `survey-${site.id}`,
        kind: 'site',
        at: site.siteSurveyCompletedAt,
        title: 'Technical survey completed',
        detail: at(
          site.id,
          site.siteSurveyAssigneeName
            ? `by ${site.siteSurveyAssigneeName}`
            : 'Survey marked complete',
        ),
      });
    }
    // A rejected quote also reads `lost`, with no lost date: only a closed site was "marked".
    if (siteClosed(site) && site.lostAt) {
      events.push({
        id: `lost-${site.id}`,
        kind: 'lost',
        at: site.lostAt,
        title: 'Site marked lost',
        detail: at(site.id, site.journeyLostReason ?? 'No reason recorded'),
      });
    }
  }

  // Past only: a follow-up still to come is in the Follow-ups card.
  for (const followup of facts.followups ?? []) {
    if (followup.status === FollowupStatus.PENDING) continue;
    const done = followup.status === FollowupStatus.COMPLETED;
    events.push({
      id: `followup-${followup.id}`,
      kind: 'followup',
      // Cancelling sets no completion time; the planned time may still be in the future.
      at: followup.completedAt ?? (done ? followup.scheduledAt : followup.updatedAt),
      title: `${toTitleLabel(followup.type)} ${done ? 'done' : 'cancelled'}${
        followup.outcome ? ` · ${OUTCOME_LABELS[followup.outcome].toLowerCase()}` : ''
      }`,
      detail: at(followup.propertyId, followup.subject.trim() || 'Untitled follow-up'),
      followupId: followup.id,
    });
  }

  for (const quote of facts.quotes ?? []) {
    events.push({
      id: `quote-${quote.id}`,
      kind: 'quote',
      at: quote.quoteDate,
      dayOnly: true,
      title: `Quote ${quote.quoteNumber}`,
      detail: at(
        quote.propertyId,
        [
          quote.voidedAt ? `${toTitleLabel(quote.status)}, voided` : toTitleLabel(quote.status),
          quote.finalPrice ? formatCurrency(quote.finalPrice) : null,
        ]
          .filter(Boolean)
          .join(' · '),
      ),
      href: buildRoute(ROUTES.QUOTES.DETAIL, { id: quote.id }),
    });
  }

  for (const project of facts.projects ?? []) {
    const href = buildRoute(ROUTES.PROJECTS.DETAIL, { id: project.id });
    // The day the project record was made is a fact; `startDate` is only a plan.
    const cancelledLater = project.status === ProjectStatus.CANCELLED ? ' (cancelled later)' : '';
    if (project.createdAt) {
      events.push({
        id: `project-${project.id}`,
        kind: 'project',
        at: project.createdAt,
        title: `Project created${cancelledLater}`,
        detail: at(project.propertyId, `${project.projectNumber} · ${project.name}`),
        href,
      });
    }
    if (project.meterInstalledOn) {
      events.push({
        id: `meter-${project.id}`,
        kind: 'project',
        at: project.meterInstalledOn,
        dayOnly: true,
        title: 'Net meter installed',
        detail: at(project.propertyId, project.projectNumber),
        href,
      });
    }
  }

  for (const receipt of facts.receipts ?? []) {
    // Money in can also be a refund coming back: only a receipt is a payment.
    if (receipt.entryType !== 'receipt') continue;
    // A reversal is stored as a negative amount; the title already says "reversed".
    const amount = formatPaise(Math.abs(receipt.amountPaise));
    events.push({
      id: `receipt-${receipt.id}`,
      kind: 'money',
      at: receipt.valueDate,
      dayOnly: true,
      title: receipt.reversesId ? `Payment reversed · ${amount}` : `Payment received · ${amount}`,
      detail: [
        receipt.entryNo,
        receipt.paymentMethod ? formatPaymentMethod(receipt.paymentMethod) : null,
        receipt.valueDateIsInferred ? 'date is approximate' : null,
      ]
        .filter(Boolean)
        .join(' · '),
    });
  }

  for (const loan of facts.loans ?? []) {
    events.push({
      id: `loan-${loan.id}`,
      kind: 'loan',
      at: loan.updatedAt,
      title: `Loan · ${toTitleLabel(loan.status)}`,
      detail: at(
        loan.propertyId,
        [
          loan.lenderName ||
            (loan.property?.financingBank
              ? bankLabel(loan.property.financingBank)
              : 'Lender not set'),
          loan.loanAmount != null ? formatCurrency(loan.loanAmount) : 'amount pending',
        ].join(' · '),
      ),
    });
  }

  for (const ticket of facts.tickets ?? []) {
    events.push({
      id: `ticket-${ticket.id}`,
      kind: 'service',
      at: ticket.createdAt,
      title: `Ticket raised · ${ticket.title}`,
      detail: [ticket.ticketNumber, ticket.projectNumber, ticket.createdByName]
        .filter(Boolean)
        .join(' · '),
      href: buildRoute(ROUTES.SERVICE.DETAIL, { id: ticket.id }),
    });
  }

  return events.sort((a, b) => sortTime(b) - sortTime(a));
}

/**
 * When an event counts as having happened, for the order only. A day-only date
 * has no time: it is placed at the end of its India day, so a payment dated
 * today sits above the customer record made this morning.
 */
function sortTime(event: HistoryEvent): number {
  return event.dayOnly
    ? new Date(`${event.at.slice(0, 10)}T23:59:59+05:30`).getTime()
    : new Date(event.at).getTime();
}

export interface HistoryCardProps {
  events: HistoryEvent[];
  many: boolean;
  /** A source did not load, so some events are missing from the list. */
  incomplete: boolean;
  onViewFollowup: (followupId: string) => void;
  delayMs?: number;
}

/** A screenful; the rest opens in place. */
const FIRST_SHOWN = 12;

export function HistoryCard({
  events,
  many,
  incomplete,
  onViewFollowup,
  delayMs,
}: HistoryCardProps): JSX.Element {
  const [kind, setKind] = useState<HistoryKind | null>(null);
  const [all, setAll] = useState(false);
  const kinds = useMemo(() => [...new Set(events.map((event) => event.kind))], [events]);
  const active = kind && kinds.includes(kind) ? kind : null;
  const filtered = active ? events.filter((event) => event.kind === active) : events;
  const shown = all ? filtered : filtered.slice(0, FIRST_SHOWN);

  return (
    <PageCard
      id="history"
      title={`Everything that happened${many ? ' · all sites' : ''}`}
      delayMs={delayMs}
    >
      {kinds.length > 1 ? (
        <div className="mb-3.5 flex flex-wrap gap-1.5" role="group" aria-label="Kind of event">
          {[null, ...kinds].map((option) => (
            <button
              key={option ?? 'all'}
              type="button"
              aria-pressed={active === option}
              onClick={() => setKind(option)}
              className={cn(
                'rounded-pill px-3 py-1.5 text-[13px]',
                active === option
                  ? 'bg-foreground text-white'
                  : 'bg-background-tertiary text-foreground-secondary',
              )}
            >
              {option ? KIND_LABEL[option] : 'All'}
            </button>
          ))}
        </div>
      ) : null}

      <ol className="m-0 flex list-none flex-col p-0">
        {shown.map((event, index) => {
          const body = (
            <>
              <span className="block text-[14px] font-medium [overflow-wrap:anywhere]">
                {event.title}
              </span>
              {event.detail ? (
                <span className="block text-[13px] text-foreground-secondary [overflow-wrap:anywhere]">
                  {event.detail}
                </span>
              ) : null}
            </>
          );
          return (
            <li
              key={event.id}
              className="relative grid grid-cols-[76px_24px_minmax(0,1fr)] gap-2.5 pb-4 last:pb-0"
            >
              <time
                dateTime={event.at}
                className="pt-[3px] text-right text-[12px] tabular-nums text-foreground-tertiary"
              >
                {event.dayOnly ? formatBusinessDate(event.at) : formatDate(event.at)}
              </time>
              <span
                aria-hidden
                className={cn(
                  'z-[1] grid size-6 place-items-center rounded-full text-[11px] font-semibold',
                  KIND_DOT[event.kind],
                )}
              >
                {KIND_LABEL[event.kind].charAt(0)}
              </span>
              {index < shown.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute bottom-0.5 left-[97px] top-[26px] w-0.5 bg-border"
                />
              ) : null}
              <div className="min-w-0">
                {event.followupId ? (
                  <button
                    type="button"
                    className="block w-full text-left hover:text-primary-dark"
                    onClick={() => onViewFollowup(event.followupId as string)}
                  >
                    {body}
                  </button>
                ) : event.href ? (
                  <NextLink
                    href={event.href}
                    prefetch={false}
                    className="block text-foreground hover:text-primary-dark"
                  >
                    {body}
                  </NextLink>
                ) : (
                  body
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {filtered.length > FIRST_SHOWN ? (
        <button
          type="button"
          aria-expanded={all}
          onClick={() => setAll((value) => !value)}
          className="mt-3 text-[13px] font-medium text-primary-dark hover:underline"
        >
          {all ? 'Show fewer' : `Show all ${filtered.length}`}
        </button>
      ) : null}

      {incomplete ? (
        <p className="m-0 mt-3.5 text-[13px] text-error">
          Some records could not load, so this list is not complete. Reload the page to try again.
        </p>
      ) : null}
      <p className="m-0 mt-3.5 text-[12px] text-foreground-tertiary">
        Built from the records we keep. A change of status or of owner is not saved, so it is not
        listed.
      </p>
    </PageCard>
  );
}

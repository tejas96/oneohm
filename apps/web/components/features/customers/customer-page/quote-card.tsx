'use client';

import { QuoteStatus, SiteStatus } from '@tejas96/shared/types';
import NextLink from 'next/link';
import type { JSX } from 'react';

import { QUOTE_STATUS_TONE } from '../constants';
import type { CustomerPropertyResponse } from '../hooks';
import { siteClosed } from './build-attention';
import {
  Blank,
  CardBones,
  CardError,
  EmptyNote,
  Kv,
  Line,
  PageCard,
  PillButton,
  SubHeading,
  TEXT_ACTION,
} from './parts';
import { QUOTE_EXPIRY_WARN_DAYS, quoteDaysLeft } from './quote-validity';

import { usePropertyQuotes } from '@/components/features/properties/hooks/use-property-quotes';
import { useQuoteDetail } from '@/components/features/quotes/hooks/use-quote-detail';
import type { QuoteSnapshot } from '@/components/features/quotes/types/calculator.types';
import { QuietPill } from '@/components/shared/calm-list';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useGatedAction } from '@/lib/rbac';
import {
  contractMovedNote,
  formatCurrency,
  formatDate,
  formatSystemSize,
  toTitleLabel,
} from '@/lib/utils';

/** "6 × 540 Wp Waaree DCR panels", one entry per kind of panel on the quote. */
function systemLines(snapshot: QuoteSnapshot | undefined): {
  parts: string[];
  warranty: string | null;
} {
  const calculation = snapshot?.calculation;
  if (!calculation) return { parts: [], warranty: null };

  const panels = (calculation.panels ?? []).map((panel) =>
    [
      `${panel.quantity} × ${panel.wattagePerPanel} Wp`,
      panel.brand,
      panel.isDcr ? 'DCR' : null,
      panel.quantity === 1 ? 'panel' : 'panels',
    ]
      .filter(Boolean)
      .join(' '),
  );
  const inverters = (calculation.inverters?.inverters ?? []).map((inverter) =>
    [
      inverter.quantity > 1 ? `${inverter.quantity} ×` : null,
      `${inverter.capacityKw} kW`,
      inverter.brand,
      inverter.quantity === 1 ? 'inverter' : 'inverters',
    ]
      .filter(Boolean)
      .join(' '),
  );
  const structure = calculation.structure?.structureType
    ? `${toTitleLabel(calculation.structure.structureType)} structure`
    : null;

  const firstPanel = calculation.panels?.[0];
  const firstInverter = calculation.inverters?.inverters?.[0];
  const warranty = [
    firstPanel?.productWarrantyYears ? `panels ${firstPanel.productWarrantyYears} years` : null,
    firstPanel?.performanceWarrantyYears
      ? `output ${firstPanel.performanceWarrantyYears} years`
      : null,
    firstInverter?.productWarrantyYears
      ? `inverter ${firstInverter.productWarrantyYears} years`
      : null,
  ].filter(Boolean);

  return {
    parts: [...panels, ...inverters, ...(structure ? [structure] : [])],
    warranty: warranty.length > 0 ? `Warranty: ${warranty.join(' · ')}` : null,
  };
}

/** "valid until 4 Oct 2026", or "expired 9 May 2026" for a sent quote past its date. */
function otherValidity(quote: {
  validUntil?: string;
  status: QuoteStatus;
  voidedAt?: string;
}): string | null {
  if (!quote.validUntil) return null;
  const daysLeft = quoteDaysLeft({
    validUntil: quote.validUntil,
    status: quote.status,
    voided: Boolean(quote.voidedAt),
  });
  return daysLeft !== null && daysLeft < 0
    ? `expired ${formatDate(quote.validUntil)}`
    : `valid until ${formatDate(quote.validUntil)}`;
}

export interface QuoteCardProps {
  site: CustomerPropertyResponse;
  customerInactive: boolean;
  onNewQuote: () => void;
  delayMs?: number;
}

/**
 * The number of the live accepted quote that locks the site against new
 * quotes, or null. The same fact the server's lock check reads: the deal quote
 * is the live accepted one whenever there is one.
 */
function lockingQuoteOf(site: Pick<CustomerPropertyResponse, 'dealQuote'>): string | null {
  const deal = site.dealQuote;
  return deal && deal.status === QuoteStatus.ACCEPTED && !deal.voided ? deal.number : null;
}

/**
 * The quote the site's stage is read from (the server's pick — never a second
 * rule here), what it would install, and the site's other quotes.
 */
export function QuoteCard({
  site,
  customerInactive,
  onNewQuote,
  delayMs,
}: QuoteCardProps): JSX.Element {
  const lockedBy = lockingQuoteOf(site);
  const quotesQuery = usePropertyQuotes(site.id);
  const deal = site.dealQuote ?? null;
  const detailQuery = useQuoteDetail(deal?.id ?? '', { enabled: Boolean(deal) });
  const newQuote = useGatedAction('quotes.create', onNewQuote, 'New quote');

  const quotes = quotesQuery.data?.data ?? [];
  const row = deal ? quotes.find((quote) => quote.id === deal.id) : undefined;
  const others = deal ? quotes.filter((quote) => quote.id !== deal.id) : quotes;
  const blockedReason = customerInactive
    ? 'Blocked while the customer is inactive'
    : lockedBy
      ? `New quotes are locked. ${lockedBy} is accepted.`
      : siteClosed(site)
        ? 'This site is lost. Reopen it to make a new quote.'
        : null;

  // Shown only when nothing blocks a new quote; the reason is printed in its place.
  const newQuoteButton = (
    <PillButton ariaDisabled={!newQuote.allowed} onClick={newQuote.onGatedClick}>
      New quote
    </PillButton>
  );

  if (!deal) {
    return (
      <PageCard id="quote" title="Quote" delayMs={delayMs}>
        {quotesQuery.isLoading ? (
          <CardBones rows={2} />
        ) : quotesQuery.isError ? (
          <CardError what="the quotes" onRetry={() => void quotesQuery.refetch()} />
        ) : (
          <>
            <EmptyNote
              title="Not quoted yet"
              hint={
                site.surveyDone || site.siteVisitDone
                  ? 'The site is ready for its first quote.'
                  : site.siteStatus === SiteStatus.CANCELLED
                    ? 'Site activity was cancelled, so no visit or survey comes first.'
                    : 'Do the site visit and the survey first.'
              }
            />
            {blockedReason ? (
              <p className="m-0 mt-3 text-[13px] text-foreground-tertiary">{blockedReason}</p>
            ) : (
              <div className="mt-3">{newQuoteButton}</div>
            )}
          </>
        )}
      </PageCard>
    );
  }

  const daysLeft = quoteDaysLeft({
    validUntil: row?.validUntil,
    status: deal.status,
    voided: deal.voided,
  });
  const system = systemLines(detailQuery.data?.quoteSnapshot);
  const madeBy = row?.salesPersonName ?? row?.createdByName ?? null;
  const moved = contractMovedNote(site);
  // "—" only once the list has answered: a date that is still loading is not a missing date.
  const listPending = quotesQuery.isLoading ? 'Loading…' : <Blank />;

  return (
    <PageCard
      id="quote"
      title="Quote"
      delayMs={delayMs}
      action={
        <NextLink
          href={buildRoute(ROUTES.QUOTES.DETAIL, { id: deal.id })}
          prefetch={false}
          className={TEXT_ACTION}
        >
          Open quote →
        </NextLink>
      }
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[24px] font-semibold tracking-[-0.02em] tabular-nums">
          {/* A voided quote's price is dead: it is named, never shown as the site's value. */}
          {deal.voided || deal.finalPrice == null ? '—' : formatCurrency(deal.finalPrice)}
        </span>
        <QuietPill
          label={toTitleLabel(deal.status)}
          tone={QUOTE_STATUS_TONE[deal.status] ?? 'neutral'}
          whole
        />
        {deal.voided ? <QuietPill label="Voided" tone="neutral" whole /> : null}
        {daysLeft !== null && daysLeft <= QUOTE_EXPIRY_WARN_DAYS ? (
          <QuietPill
            label={
              daysLeft < 0 ? 'Expired' : daysLeft === 0 ? 'Expires today' : `${daysLeft}d left`
            }
            tone={daysLeft <= 0 ? 'danger' : 'warning'}
            whole
          />
        ) : null}
      </div>
      {!deal.voided && row?.effectivePrice != null && row.effectivePrice !== deal.finalPrice ? (
        <div className="text-[13px] tabular-nums text-foreground-secondary">
          {formatCurrency(row.effectivePrice)} for the customer after subsidy
        </div>
      ) : null}
      {deal.voided && row?.voidReason ? (
        <div className="text-[13px] text-foreground-secondary">Voided: {row.voidReason}</div>
      ) : null}
      {moved ? <div className="text-[13px] text-foreground-secondary">{moved}</div> : null}

      <div className="mt-2.5 rounded-xl bg-background-tertiary px-3 py-2.5 text-[13px] text-foreground-secondary">
        <b className="block font-medium text-foreground">
          {[
            deal.systemSizeKw != null ? `${formatSystemSize(deal.systemSizeKw)} kW` : null,
            row?.systemType ? toTitleLabel(row.systemType) : null,
            row?.totalWattageWp ? `${row.totalWattageWp} Wp` : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'System size not set'}
        </b>
        {detailQuery.isLoading ? (
          <span className="text-foreground-tertiary">Loading what it installs…</span>
        ) : detailQuery.isError ? (
          <CardError what="the panels and inverter" onRetry={() => void detailQuery.refetch()} />
        ) : system.parts.length > 0 ? (
          <>
            {system.parts.join(' · ')}
            {system.warranty ? <span className="block">{system.warranty}</span> : null}
          </>
        ) : (
          <span className="text-foreground-tertiary">
            Panels and inverter are not on this quote.
          </span>
        )}
      </div>

      <div className="mt-3">
        <Kv
          narrow
          rows={[
            { label: 'Number', value: <span className="tabular-nums">{deal.number}</span> },
            { label: 'Quoted on', value: deal.quoteDate ? formatDate(deal.quoteDate) : <Blank /> },
            {
              label: 'Valid until',
              value: row?.validUntil ? formatDate(row.validUntil) : listPending,
            },
            { label: 'Made by', value: madeBy ?? listPending },
          ]}
        />
      </div>
      {quotesQuery.isError ? (
        <div className="mt-2">
          <CardError what="the site's quotes" onRetry={() => void quotesQuery.refetch()} />
        </div>
      ) : null}

      {others.length > 0 ? (
        <>
          <SubHeading>Other quotes for this site · {others.length}</SubHeading>
          {others.map((quote) => (
            <Line
              key={quote.id}
              title={
                <NextLink
                  href={buildRoute(ROUTES.QUOTES.DETAIL, { id: quote.id })}
                  prefetch={false}
                  className="tabular-nums text-foreground hover:text-primary-dark hover:underline"
                >
                  {quote.quoteNumber}
                </NextLink>
              }
              sub={
                <>
                  {[
                    quote.voidedAt
                      ? `${toTitleLabel(quote.status)}, voided`
                      : toTitleLabel(quote.status),
                    formatDate(quote.quoteDate),
                    quote.systemSizeKw ? `${formatSystemSize(quote.systemSizeKw)} kW` : null,
                    quote.finalPrice != null ? formatCurrency(quote.finalPrice) : null,
                    !quote.voidedAt &&
                    quote.effectivePrice != null &&
                    quote.effectivePrice !== quote.finalPrice
                      ? `${formatCurrency(quote.effectivePrice)} after subsidy`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  <span className="block">
                    {[
                      otherValidity(quote),
                      (quote.salesPersonName ?? quote.createdByName)
                        ? `by ${quote.salesPersonName ?? quote.createdByName}`
                        : null,
                      quote.voidedAt && quote.voidReason ? `Voided: ${quote.voidReason}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </>
              }
            />
          ))}
        </>
      ) : null}

      {blockedReason ? (
        <p className="m-0 mt-3 text-[13px] text-foreground-tertiary">{blockedReason}</p>
      ) : (
        <div className="mt-3.5">{newQuoteButton}</div>
      )}
    </PageCard>
  );
}

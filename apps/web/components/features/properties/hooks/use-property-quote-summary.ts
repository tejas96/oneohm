'use client';

import { QuoteStatus } from '@tejas96/shared/types';
import { useMemo } from 'react';

import { usePropertyQuotes, type CustomerQuote } from './use-property-quotes';

/**
 * The commercial facts about a site, recovered from its quotes.
 *
 * `GET /customer-properties/:id` returns **none** of the `latestQuote*`
 * enrichment fields — those are added only by the customer-scoped *list*
 * endpoint. The detail page read them anyway, so a converted site with an
 * accepted ₹1.88L quote rendered "Quote value —", "System size —" and a
 * pipeline that claimed "No quote". Everything here comes from the quotes
 * endpoint instead, which is the same source the Quotes tab renders.
 *
 * Query params match `usePropertyQuotes`' defaults so the page and the tab
 * share one cache entry and one request.
 */

export interface PropertyQuoteSummary {
  /**
   * The quote that speaks for this site: the accepted one if there is one,
   * otherwise the most recent. An accepted quote outranks a later draft —
   * the signed price is the real price no matter what has been drafted since.
   *
   * Voided quotes are skipped, never merely demoted, so a site whose only
   * quote has been withdrawn is `null` here and reads as having no quote —
   * which it does. This mirrors `findLatestByPropertyIds` on the server,
   * which feeds the same `latestQuote*` fields from the list endpoint; the
   * two must not disagree about what the current quote is.
   */
  headline: CustomerQuote | null;
  /** Present only once a quote has actually been accepted, and not voided since. */
  accepted: CustomerQuote | null;
  /** Every quote for the site, newest first. Voided ones included — this is the history. */
  quotes: CustomerQuote[];
  count: number;
  isLoading: boolean;
}

const EMPTY: CustomerQuote[] = [];

export function usePropertyQuoteSummary(
  propertyId: string,
  options?: { enabled?: boolean },
): PropertyQuoteSummary {
  const { data, isLoading } = usePropertyQuotes(options?.enabled === false ? '' : propertyId);

  const quotes = useMemo(() => {
    const rows = data?.data ?? EMPTY;
    return [...rows].sort(
      (a, b) => new Date(b.quoteDate).getTime() - new Date(a.quoteDate).getTime(),
    );
  }, [data?.data]);

  /*
    `!quote.voidedAt` on both lookups, because voiding deliberately leaves
    `status` alone: a withdrawn quote still reads `accepted`, and a withdrawn
    draft still reads `draft`. Reading `status` by itself let a dead price
    stand as the site's headline — the property page showed "Quote value
    ₹5,16,697" from a quote the office had already taken back, directly above
    a table row correctly marked Voided.

    Cancelling a project is what voids an accepted quote, and that is exactly
    the moment the roof is free again, so a voided acceptance must not keep
    speaking for the site either.
  */
  const isLive = (quote: CustomerQuote): boolean => !quote.voidedAt;

  const accepted = useMemo(
    () => quotes.find((quote) => quote.status === QuoteStatus.ACCEPTED && isLive(quote)) ?? null,
    [quotes],
  );

  const latestLive = useMemo(() => quotes.find(isLive) ?? null, [quotes]);

  return {
    headline: accepted ?? latestLive,
    accepted,
    quotes,
    count: quotes.length,
    isLoading,
  };
}

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
   */
  headline: CustomerQuote | null;
  /** Present only once a quote has actually been accepted. */
  accepted: CustomerQuote | null;
  /** Every quote for the site, newest first. */
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

  const accepted = useMemo(
    () => quotes.find((quote) => quote.status === QuoteStatus.ACCEPTED) ?? null,
    [quotes],
  );

  return {
    headline: accepted ?? quotes[0] ?? null,
    accepted,
    quotes,
    count: quotes.length,
    isLoading,
  };
}

import type { QuoteStatus } from '@tejas96/shared/types';

import { DOCUMENT_TYPE_LABELS, QUOTE_STATUS_TONE } from './constants';
import type { CustomerPropertyResponse } from './hooks/use-customer-properties';

import type { CrmTone } from '@/components/shared/crm-table';
import { toTitleLabel } from '@/lib/utils';

/**
 * Get human-readable label for a document tag.
 * Falls back to title-cased tag if not in the lookup.
 */
export function getDocumentTypeLabel(tag: string): string {
  return (
    DOCUMENT_TYPE_LABELS[tag] || tag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/** The quote a screen should print for a site, in one shape. */
export interface SiteQuoteFacts {
  id?: string;
  number?: string;
  /** Absent only on a legacy record whose one quote is voided. */
  status?: QuoteStatus;
  /** The day printed on THIS quote; null when the record carries none. */
  quoteDate: string | null;
  /** It is history, not the roof's current quote. */
  voided: boolean;
  finalPrice?: number | null;
  systemSizeKw?: number | null;
  /** "Accepted", "Accepted · voided" — null when there is no status to print. */
  statusLabel: string | null;
  tone: CrmTone;
}

/**
 * Which quote to show beside a site's stage.
 *
 * The stage is read from the site's DEAL quote (a live accepted quote, else
 * the newest live one, else the newest voided one), so the quote printed next
 * to it must be that same quote — `dealQuote`, which both site reads carry.
 * `latestQuote*` is the newest live quote and can name a later draft while the
 * stage says "Won" on the accepted one. Those older fields are only the
 * fallback for a record from an endpoint that does not compute `dealQuote`.
 */
export function siteQuoteFacts(
  property: Pick<
    CustomerPropertyResponse,
    | 'dealQuote'
    | 'latestQuoteId'
    | 'latestQuoteNumber'
    | 'latestQuoteStatus'
    | 'latestQuoteVoided'
    | 'latestQuoteDate'
    | 'latestQuoteFinalPrice'
    | 'latestQuoteSystemSizeKw'
  >,
): SiteQuoteFacts | null {
  const deal = property.dealQuote;

  if (deal) {
    const status = toTitleLabel(deal.status);
    return {
      id: deal.id,
      number: deal.number,
      status: deal.status,
      quoteDate: deal.quoteDate ?? null,
      voided: deal.voided,
      finalPrice: deal.finalPrice,
      systemSizeKw: deal.systemSizeKw,
      statusLabel: deal.voided ? `${status} · voided` : status,
      tone: deal.voided ? 'neutral' : (QUOTE_STATUS_TONE[deal.status] ?? 'neutral'),
    };
  }
  // The server says this site has no quote at all.
  if (deal === null) return null;

  if (!property.latestQuoteId && !property.latestQuoteStatus) return null;
  const status = property.latestQuoteStatus;
  return {
    id: property.latestQuoteId,
    number: property.latestQuoteNumber,
    status,
    quoteDate: property.latestQuoteDate ?? null,
    voided: Boolean(property.latestQuoteVoided),
    finalPrice: property.latestQuoteFinalPrice,
    systemSizeKw: property.latestQuoteSystemSizeKw,
    statusLabel: status ? toTitleLabel(status) : null,
    tone: status ? (QUOTE_STATUS_TONE[status] ?? 'neutral') : 'neutral',
  };
}

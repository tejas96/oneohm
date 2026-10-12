import { followupIstDayDiff, QuoteStatus } from '@tejas96/shared/types';

/** A quote whose price can still be accepted. */
const LIVE_STATUSES: readonly QuoteStatus[] = [
  QuoteStatus.DRAFT,
  QuoteStatus.SENT,
  QuoteStatus.VIEWED,
];

/** A quote this close to its last valid day is worth a call. */
export const QUOTE_EXPIRY_WARN_DAYS = 7;

/**
 * Days until a quote's price stops being real; negative once it has. Null when
 * the date means nothing any more: the quote is voided, accepted or rejected.
 *
 * One rule for the Quote card and the attention list, counted in whole India
 * calendar days.
 */
export function quoteDaysLeft(
  quote: { validUntil?: string | null; status: QuoteStatus; voided: boolean },
  now: Date = new Date(),
): number | null {
  if (!quote.validUntil || quote.voided || !LIVE_STATUSES.includes(quote.status)) return null;
  // A date-only value names a calendar day: read at India noon it stays that day.
  const lastDay = /^\d{4}-\d{2}-\d{2}$/.test(quote.validUntil)
    ? new Date(`${quote.validUntil}T12:00:00+05:30`)
    : new Date(quote.validUntil);
  return followupIstDayDiff(lastDay, now);
}

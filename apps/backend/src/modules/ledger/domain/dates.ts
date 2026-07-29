/**
 * Business dates for the ledger.
 *
 * Every date the ledger records is an **IST business date**, because the
 * business operates in India and a receipt belongs to the day the money moved
 * there — not to a UTC calendar day.
 *
 * This mattered concretely: `receipt.service.ts` previously computed "today"
 * with `getUTCFullYear/Month/Date`, so between 00:00 and 05:30 IST every receipt
 * was stamped with the *previous* day, and the not-in-the-future guard rejected
 * legitimate same-day entries during those hours.
 */

const IST = 'Asia/Kolkata';

/** Today as an IST business date, `YYYY-MM-DD`. (`en-CA` formats that way.) */
export function todayIst(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Normalise an ISO date or datetime to a bare `YYYY-MM-DD`. */
export function toIsoDate(value: string): string {
  return value.slice(0, 10);
}

/**
 * Read a Postgres `date` column as `YYYY-MM-DD`, whatever shape the driver
 * hands back.
 *
 * node-postgres hydrates `date` as a JS `Date` at **local midnight** for raw
 * queries, and as a plain string through the entity layer. Calling
 * `.toISOString()` on that Date converts local→UTC, which in IST (UTC+5:30)
 * lands at 18:30 the PREVIOUS day — so `2026-05-06` is emitted as `2026-05-05`.
 *
 * That shift was live on the customer-facing payments endpoint until this
 * helper replaced it. The local date parts are correct precisely because the
 * driver built the Date in local time to begin with.
 */
export function pgDateToIso(value: string | Date): string {
  if (typeof value === 'string') {
    return toIsoDate(value);
  }
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * The Indian financial year containing a business date, e.g. `2026-27`.
 *
 * Computed from the supplied date rather than `new Date()` so it always agrees
 * with the entry's own value date. The existing `SequenceService` computes this
 * from the current UTC instant, which disagrees with IST value dates on 31 March
 * between 18:30 and 24:00 IST — putting a receipt in the wrong financial year.
 */
export function financialYearOf(isoDate: string): string {
  const [yearStr, monthStr] = toIsoDate(isoDate).split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const startYear = month >= 4 ? year : year - 1;
  const endShort = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${endShort}`;
}

/** True when `isoDate` is later than today in IST. */
export function isFutureIst(isoDate: string): boolean {
  return toIsoDate(isoDate) > todayIst();
}

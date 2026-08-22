import { COMPANY } from '../../constants/company';
import { LeadTemperature } from '../enums/customer.enum';

/**
 * How many days ahead the next followup is prefilled, by lead temperature.
 *
 * Prefill only — always editable, never enforced. Changing a property's
 * temperature does not move followups that are already scheduled.
 */
export const LEAD_TEMPERATURE_CADENCE_DAYS: Record<LeadTemperature, number> = {
  [LeadTemperature.HOT]: 3,
  [LeadTemperature.WARM]: 10,
  [LeadTemperature.COLD]: 15,
};

/**
 * A customer with no property yet has no temperature. It is a fresh enquiry and
 * the goal is to capture a site quickly, so it is chased on the HOT rhythm.
 */
export const CUSTOMER_LEAD_CADENCE_DAYS = 3;

/** The hour a follow-up defaults to (IST business calendar). */
export const DEFAULT_FOLLOWUP_HOUR = 10;

const FOLLOWUP_TZ = COMPANY.timezone;

/** Calendar day in the business timezone as `YYYY-MM-DD`. */
export function followupIstYmd(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FOLLOWUP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Whole calendar days between two instants in IST (`a` minus `b`). */
export function followupIstDayDiff(a: Date, b: Date): number {
  const parse = (ymd: string): number => new Date(`${ymd}T00:00:00+05:30`).getTime();
  return Math.round((parse(followupIstYmd(a)) - parse(followupIstYmd(b))) / 86_400_000);
}

/**
 * Puts a calendar day on the default follow-up hour in IST.
 *
 * Do not use `setHours(10)` — that follows the host timezone, not Kolkata.
 */
export function atDefaultHour(date: Date): Date {
  const ymd = followupIstYmd(date);
  const hour = String(DEFAULT_FOLLOWUP_HOUR).padStart(2, '0');
  return new Date(`${ymd}T${hour}:00:00+05:30`);
}

/** Returns a new Date; never mutates the input. Day shift only — compose with `atDefaultHour` for prefill. */
export function nextFollowupDate(from: Date, temperature?: LeadTemperature | null): Date {
  const days = temperature
    ? LEAD_TEMPERATURE_CADENCE_DAYS[temperature]
    : CUSTOMER_LEAD_CADENCE_DAYS;
  const next = new Date(from.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Merge a date-picker or time-picker change without clobbering the other part.
 *
 * Pickers run in the viewer's local timezone; in production that is IST.
 */
export function mergeFollowupDateTime(
  base: Date | null,
  part: 'date' | 'time',
  picked: Date,
): Date {
  const anchor = base ?? atDefaultHour(new Date());
  const result = new Date(anchor.getTime());

  if (part === 'date') {
    result.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
  } else {
    result.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  }

  result.setSeconds(0, 0);
  result.setMilliseconds(0);
  return result;
}

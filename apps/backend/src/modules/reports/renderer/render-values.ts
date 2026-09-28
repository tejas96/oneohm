import { COMPANY } from '@tejas96/shared/constants';

/**
 * Values a template may print that are not facts: they belong to the moment
 * of rendering, so they never enter a report's fingerprint and never turn a
 * filed report Out of date.
 */
export const GENERATED_ON = 'generated_on';
export const RENDER_VALUES: ReadonlySet<string> = new Set([GENERATED_ON]);

/** Today in the company's time zone, DD-MM-YYYY: the date a letter is written. */
export function formatGeneratedOn(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: COMPANY.timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${part('day')}-${part('month')}-${part('year')}`;
}

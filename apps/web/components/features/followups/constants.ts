import { FollowupOutcome } from '@tejas96/shared/types';

import { crm } from '@/lib/theme/tokens';

/** Sentence-case labels. Keep in sync with FollowupOutcome. */
export const OUTCOME_LABELS: Record<FollowupOutcome, string> = {
  [FollowupOutcome.NOT_REACHABLE]: 'Not reachable',
  [FollowupOutcome.CALL_BACK_LATER]: 'Call back later',
  [FollowupOutcome.INTERESTED]: 'Interested',
  [FollowupOutcome.SITE_VISIT_DONE]: 'Site visit done',
  [FollowupOutcome.DOCUMENTS_PENDING]: 'Documents pending',
  [FollowupOutcome.NEGOTIATING]: 'Negotiating',
  [FollowupOutcome.NOT_INTERESTED]: 'Not interested',
  [FollowupOutcome.OTHER]: 'Other',
};

/** The four buckets on /followups. */
export type FollowupScope = 'overdue' | 'today' | 'upcoming' | 'gaps';

export const SCOPE_LABELS: Record<FollowupScope, string> = {
  overdue: 'Overdue',
  today: 'Today',
  upcoming: 'Upcoming',
  gaps: 'Needs follow-up',
};

/**
 * One track per follow-up column. Kept here — not inline in the list —
 * so the grid-token tests can pin the floors without importing a client
 * component. `FollowupList` must read from this object, not from the
 * customer-list tokens these used to alias.
 */
export const FOLLOWUP_GRID_TRACKS = {
  due: crm['col-followup-due'],
  lead: crm['col-followup-lead'],
  temperature: crm['col-followup-temp'],
  subject: crm['col-followup-subject'],
  owner: crm['col-followup-owner'],
  actions: crm['col-followup-actions'],
} as const;

/**
 * Start of today and tomorrow in the business timezone (Asia/Kolkata).
 *
 * Matches Postgres `date_trunc('day', now())` on a session pinned to IST so
 * `/followups` list filters agree with `/summary` and nav badges.
 */
export function dayBoundaries(now: Date = new Date()): {
  startOfToday: Date;
  startOfTomorrow: Date;
} {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const startOfToday = new Date(`${ymd}T00:00:00+05:30`);
  const tomorrow = new Date(startOfToday.getTime() + 86_400_000);
  const tomorrowYmd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(tomorrow);
  const startOfTomorrow = new Date(`${tomorrowYmd}T00:00:00+05:30`);

  return { startOfToday, startOfTomorrow };
}

import { FollowupOutcome } from '@tejas96/shared/types';

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
 * Start of today and tomorrow in the viewer's timezone.
 *
 * The scope buckets are defined by local calendar days, not by UTC — an
 * overdue list that flips at 5:30am local because the server thinks in UTC
 * would be worse than useless.
 */
export function dayBoundaries(now: Date = new Date()): {
  startOfToday: Date;
  startOfTomorrow: Date;
} {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { startOfToday, startOfTomorrow };
}

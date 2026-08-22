import { followupIstDayDiff } from '@tejas96/shared/types';

import type { CrmTone } from '@/components/shared/crm-table';

export type FollowupDueTone = 'danger' | 'warning' | 'info' | 'neutral';

/**
 * Calendar-day overdue styling aligned with `/followups` buckets (IST), not `Date.now()`.
 */
export function followupDueTone(scheduledAt: string, now = new Date()): FollowupDueTone {
  const days = followupIstDayDiff(new Date(scheduledAt), now);
  if (days < 0) return 'danger';
  if (days === 0) {
    const elapsed = now.getTime() - new Date(scheduledAt).getTime();
    if (elapsed > 0) return 'warning';
    return 'info';
  }
  if (days === 1) return 'info';
  return 'neutral';
}

export function followupIsPastDue(scheduledAt: string, now = new Date()): boolean {
  return followupIstDayDiff(new Date(scheduledAt), now) < 0;
}

export function followupOverdueCount(
  followups: { scheduledAt: string; status: string }[],
  pendingStatus: string,
  now = new Date(),
): number {
  return followups.filter(
    (f) => f.status === pendingStatus && followupIsPastDue(f.scheduledAt, now),
  ).length;
}

export function crmToneFromDue(tone: FollowupDueTone): CrmTone {
  if (tone === 'danger') return 'danger';
  if (tone === 'warning') return 'warning';
  if (tone === 'info') return 'info';
  return 'neutral';
}

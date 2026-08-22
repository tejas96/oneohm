'use client';

import { FollowupStatus, type DashboardItem } from '@tejas96/shared/types';

import { useFollowups, type FollowupResponse } from '@/components/features/followups';

export interface FollowupForItem {
  followup: FollowupResponse | null;
  pendingSiblings: number;
  isLoading: boolean;
}

/**
 * Fetch the one follow-up a dashboard row refers to, plus its pending siblings.
 *
 * Scoped to the row's customer so a single request answers both questions,
 * covering the same lead-unit rule `followups-page` uses to derive the same
 * number: siblings are rows on the SAME customer AND the same property (or
 * both un-propertied), not merely the same customer. A customer with pending
 * follow-ups on two different properties must not have one property's count
 * bleed into the other's, or scheduling a next follow-up looks optional when
 * the server (`FollowupService.complete()`, via `countPendingForUnit`) will
 * insist on it. That same server re-check is the safety net for whatever this
 * scoped fetch still misses (e.g. beyond the 100-row page), so the worst case
 * stays a dialog that offers an optional next follow-up the API then insists
 * on — never a lead going dark.
 */
export function useFollowupForItem(item: DashboardItem | null): FollowupForItem {
  const customerId = item?.params.customerId;
  const query = useFollowups(
    { customerId, status: FollowupStatus.PENDING, limit: 100 },
    { enabled: Boolean(item && customerId) },
  );

  const rows = query.data?.data ?? [];
  const followupId = item?.params.id;
  const followup = rows.find((row) => row.id === followupId) ?? null;

  // The lead UNIT is customer + property, not customer alone. A customer with
  // pending follow-ups on two properties would otherwise count the other
  // property's as siblings, making the next follow-up look optional when the
  // server will insist on it.
  const unitId = item?.params.propertyId ?? null;
  const siblings = rows.filter(
    (row) => row.id !== followupId && (row.propertyId ?? null) === unitId,
  );

  return {
    followup,
    pendingSiblings: followup ? siblings.length : 0,
    isLoading: query.isPending && Boolean(item),
  };
}

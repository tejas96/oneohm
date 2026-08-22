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
 * Scoped to the row's customer so a single request answers both questions, which
 * is how `followups-page` derives the same number. Its own comment notes the
 * count can undercount and that the API re-checks before enforcing, so the worst
 * case is a dialog that offers an optional next follow-up the server then
 * insists on — never a lead going dark.
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

  return {
    followup,
    pendingSiblings: followup ? Math.max(rows.length - 1, 0) : 0,
    isLoading: query.isPending && Boolean(item),
  };
}

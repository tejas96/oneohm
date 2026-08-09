'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import { type FollowupStatus } from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { useFollowups, type FollowupsListResponse } from '@/components/features/followups/hooks';

/**
 * Property-scoped followups.
 *
 * A thin alias over the shared `useFollowups` so this list sits under the same
 * ['followups'] query-key root as every other surface. It previously owned a
 * separate ['property-followups'] namespace, which meant completing a followup
 * anywhere else left this tab showing stale rows.
 */
export function usePropertyFollowups(
  propertyId: string,
  options?: {
    enabled?: boolean;
    status?: FollowupStatus;
    from?: string;
    to?: string;
    limit?: number;
  },
): UseQueryResult<FollowupsListResponse, AxiosError> {
  return useFollowups(
    {
      propertyId,
      status: options?.status,
      from: options?.from,
      to: options?.to,
      limit: options?.limit,
    },
    { enabled: Boolean(propertyId) && options?.enabled !== false },
  );
}

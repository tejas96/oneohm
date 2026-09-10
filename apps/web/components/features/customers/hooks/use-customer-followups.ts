'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import { type FollowupStatus } from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { useFollowups, type FollowupsListResponse } from '@/components/features/followups/hooks';

export type { FollowupsListResponse };
/**
 * Customer-scoped followups — every property's followups plus any
 * customer-level ones.
 *
 * A thin alias over the shared `useFollowups` so this list sits under the same
 * ['followups'] query-key root as every other surface. Completing a followup
 * anywhere now refreshes this list too.
 */
export function useCustomerFollowups(
  customerId: string,
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
      customerId,
      status: options?.status,
      from: options?.from,
      to: options?.to,
      limit: options?.limit,
    },
    { enabled: Boolean(customerId) && options?.enabled !== false },
  );
}

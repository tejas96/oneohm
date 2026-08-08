'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  type FollowupOutcome,
  type FollowupPriority,
  type FollowupStatus,
  type FollowupType,
  type PaginationMeta,
} from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { followupKeys } from './followup-keys';

import { apiClient } from '@/lib/api/client';

export interface FollowupResponse {
  id: string;
  customerId: string;
  propertyId?: string | null;
  type: FollowupType;
  subject: string;
  scheduledAt: string;
  assignedToUserId: string;
  status: FollowupStatus;
  priority: FollowupPriority;
  notes?: string | null;
  /** Set on completion; null while pending. */
  outcome?: FollowupOutcome | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; firstName?: string; lastName?: string };
  property?: { id: string; propertyName?: string; city?: string; leadTemperature?: string };
  assignedToUser?: { id: string; firstName: string; lastName?: string };
}

export interface FollowupsListResponse {
  data: FollowupResponse[];
  meta?: PaginationMeta;
}

/** An open lead unit nobody currently owes an action. */
export interface FollowupGap {
  kind: 'customer' | 'property';
  customerId: string;
  propertyId: string | null;
  name: string;
  leadTemperature: string | null;
  attributedUserId: string | null;
}

export interface FollowupFilters {
  status?: FollowupStatus;
  assignedToUserId?: string;
  customerId?: string;
  propertyId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export function useFollowups(
  filters: FollowupFilters,
  options?: { enabled?: boolean },
): UseQueryResult<FollowupsListResponse, AxiosError> {
  return useQuery({
    queryKey: followupKeys.list(filters as Record<string, unknown>),
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, String(value));
        }
      });
      const { data } = await apiClient.get<FollowupsListResponse>(
        `/followups?${params.toString()}`,
      );
      return data;
    },
  });
}

/**
 * The safety net: open lead units with no pending followup.
 *
 * Records arrive by import and direct API call and never pass the UI gates, so
 * this is what makes whatever slipped visible instead of silently dark.
 */
export function useFollowupGaps(options?: {
  enabled?: boolean;
}): UseQueryResult<FollowupGap[], AxiosError> {
  return useQuery({
    queryKey: followupKeys.gaps(),
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const { data } = await apiClient.get<FollowupGap[]>('/followups/gaps');
      return data;
    },
  });
}

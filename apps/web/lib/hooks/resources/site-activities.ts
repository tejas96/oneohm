'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { createResourceKeys, useOrgContext } from '../core';

import {
  getSiteActivities,
  completeVisit,
  completeSurvey,
  type SiteActivity,
} from '@/lib/api/site-activities';

// ── Query Keys (FDAL-compliant with orgId) ─────────────────────

const siteActivityKeys = createResourceKeys('site-activities');

// ── Query Hooks ────────────────────────────────────────────────

export function useSiteActivityByProperty(
  propertyId: string | undefined,
): UseQueryResult<SiteActivity | null> {
  const { organizationId, isReady } = useOrgContext();

  return useQuery<SiteActivity | null>({
    queryKey: [...siteActivityKeys.all(organizationId), 'by-property', propertyId ?? ''],
    queryFn: async (): Promise<SiteActivity | null> => {
      const result = await getSiteActivities({ propertyId: propertyId!, organizationId });
      return result.data?.[0] ?? null;
    },
    enabled: !!propertyId && isReady,
  });
}

// ── Mutation Hooks ─────────────────────────────────────────────

export function useCompleteVisit(): UseMutationResult<SiteActivity, unknown, string> {
  const queryClient = useQueryClient();
  const { organizationId } = useOrgContext();

  return useMutation({
    mutationFn: (id: string): Promise<SiteActivity> => completeVisit(id, organizationId),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: siteActivityKeys.detail(organizationId, id) });
      void queryClient.invalidateQueries({ queryKey: siteActivityKeys.all(organizationId) });
    },
  });
}

export function useCompleteSurvey(): UseMutationResult<SiteActivity, unknown, string> {
  const queryClient = useQueryClient();
  const { organizationId } = useOrgContext();

  return useMutation({
    mutationFn: (id: string): Promise<SiteActivity> => completeSurvey(id, organizationId),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: siteActivityKeys.detail(organizationId, id) });
      void queryClient.invalidateQueries({ queryKey: siteActivityKeys.all(organizationId) });
    },
  });
}

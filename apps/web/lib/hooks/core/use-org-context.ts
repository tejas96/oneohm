'use client';

import { useMemo } from 'react';

import { useAuth } from '@/providers/auth-provider';

export function useOrgContext() {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  const orgHeaders = useMemo(
    () => (organizationId ? { 'X-Organization-Id': organizationId } : {}),
    [organizationId],
  );

  return { organizationId, orgHeaders, isReady: !!organizationId } as const;
}

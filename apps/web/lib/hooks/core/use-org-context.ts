'use client';

import { useMemo } from 'react';

import { useAuth } from '@/providers/auth-provider';

export function useOrgContext(): {
  readonly organizationId: string | undefined;
  readonly orgHeaders: Record<string, string>;
  readonly isReady: boolean;
} {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  const orgHeaders = useMemo(
    (): Record<string, string> => (organizationId ? { 'X-Organization-Id': organizationId } : {}),
    [organizationId],
  );

  return { organizationId, orgHeaders, isReady: !!organizationId };
}

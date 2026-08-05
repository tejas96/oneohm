'use client';

import { useMemo } from 'react';

import { canAccessFeature } from '@/lib/access-control/access';
import { useAuthStore } from '@/lib/stores/auth-store';

import type { FeatureAccessKey } from '@/lib/access-control/feature-policy';

export function useFeatureAccess(feature: FeatureAccessKey): boolean {
  const roles = useAuthStore((state) => state.user?.roles ?? []);
  return useMemo(() => canAccessFeature(roles, feature), [roles, feature]);
}

export function useAccessRoles(): readonly string[] {
  return useAuthStore((state) => state.user?.roles ?? []);
}

'use client';

import { useCallback, type MouseEvent } from 'react';

import { showFeatureAccessDenied } from '@/lib/access-control/access-feedback';
import type { FeatureAccessKey } from '@/lib/access-control/feature-policy';

interface UseGuardedNavigationOptions {
  isAllowed?: boolean;
  feature?: FeatureAccessKey;
  label?: string;
}

export function useGuardedNavigation({
  isAllowed = true,
  feature,
  label,
}: UseGuardedNavigationOptions) {
  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (isAllowed) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      showFeatureAccessDenied({ feature, label });
    },
    [feature, isAllowed, label],
  );

  return { handleClick, isDenied: !isAllowed };
}

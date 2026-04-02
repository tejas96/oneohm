'use client';

import { type JSX } from 'react';

import { Badge } from '@/components/ui';

interface LookupActiveBadgeProps {
  isActive: boolean;
}

export function LookupActiveBadge({ isActive }: LookupActiveBadgeProps): JSX.Element {
  return (
    <Badge variant={isActive ? 'success' : 'secondary'} size="xs" shape="pill">
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );
}

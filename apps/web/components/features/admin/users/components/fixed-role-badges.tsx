'use client';

import { getRolePresentation } from '@tejas96/shared';
import { type JSX } from 'react';

import { Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface FixedRoleBadgesProps {
  roles: readonly string[];
  maxVisible?: number;
  size?: 'xs' | 'sm' | 'default';
  className?: string;
}

export function FixedRoleBadges({
  roles,
  maxVisible = 3,
  size = 'sm',
  className,
}: FixedRoleBadgesProps): JSX.Element | null {
  if (roles.length === 0) {
    return null;
  }

  const visibleRoles = roles.slice(0, maxVisible);
  const hiddenCount = Math.max(roles.length - visibleRoles.length, 0);

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {visibleRoles.map((code) => {
        const presentation = getRolePresentation(code);

        return (
          <Badge
            key={code}
            variant={presentation.isLegacy ? 'muted' : 'secondary'}
            size={size}
            title={presentation.shortDescription}
          >
            {presentation.isLegacy ? `${presentation.label} (Legacy role)` : presentation.label}
          </Badge>
        );
      })}

      {hiddenCount > 0 ? (
        <Badge variant="outline" size={size}>
          +{hiddenCount}
        </Badge>
      ) : null}
    </div>
  );
}

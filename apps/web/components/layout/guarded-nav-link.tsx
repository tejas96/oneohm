'use client';

import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';

import { showFeatureAccessDenied } from '@/lib/access-control/access-feedback';
import type { FeatureAccessKey } from '@/lib/access-control/feature-policy';
import { cn } from '@/lib/utils';

interface GuardedNavLinkProps {
  href: string;
  label: string;
  className?: string;
  isAllowed?: boolean;
  feature?: FeatureAccessKey;
  children: ReactNode;
  prefetch?: boolean;
}

export function GuardedNavLink({
  href,
  label,
  className,
  isAllowed = true,
  feature,
  children,
  prefetch = false,
}: GuardedNavLinkProps): React.JSX.Element {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isAllowed) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    showFeatureAccessDenied({ feature, label });
  };

  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={cn(className)}
      onClick={handleClick}
      aria-disabled={!isAllowed ? true : undefined}
    >
      {children}
    </Link>
  );
}

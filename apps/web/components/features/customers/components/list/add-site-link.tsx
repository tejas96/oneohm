'use client';

import Link from 'next/link';
import type { JSX, ReactNode } from 'react';

import { customerLinks } from './links';

import { useGatedAction } from '@/lib/rbac';
import { cn } from '@/lib/utils';

const NOTHING = (): void => undefined;

/**
 * "Add site" for an existing customer, as a real link.
 *
 * The onboarding route is shared with the "new customer" wizard and gated on
 * `customers.create`, so it cannot tell the two intents apart. Adding a site is
 * a property write: without `properties.create` the click opens the access
 * dialog instead of leaving the page — the same rule the old buttons enforced.
 */
export function AddSiteLink({
  customerId,
  className,
  children = '+ Add site',
}: {
  customerId: string;
  className?: string;
  children?: ReactNode;
}): JSX.Element {
  const { allowed, onGatedClick } = useGatedAction('properties.create', NOTHING, 'Add site');

  return (
    <Link
      href={customerLinks.addSite(customerId)}
      prefetch={false}
      aria-disabled={!allowed}
      onClick={(event) => {
        // Never the row underneath.
        event.stopPropagation();
        if (allowed) return;
        event.preventDefault();
        onGatedClick();
      }}
      className={cn(
        'font-medium text-primary-dark hover:underline',
        !allowed && 'opacity-50',
        className,
      )}
    >
      {children}
    </Link>
  );
}

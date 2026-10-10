'use client';

import { useRouter } from 'next/navigation';
import type { JSX, ReactNode } from 'react';

import { customerLinks } from './links';

import { useGatedAction } from '@/lib/rbac';
import { cn } from '@/lib/utils';

/**
 * "Add site" for an existing customer — a gated button, like every other
 * "Add site" in the app.
 *
 * The onboarding route is shared with the "new customer" wizard and gated on
 * `customers.create`, so it cannot tell the two intents apart. Adding a site is
 * a property write: without `properties.create` the button opens the access
 * dialog instead of leaving the page.
 */
export function AddSiteButton({
  customerId,
  className,
  children = '+ Add site',
}: {
  customerId: string;
  className?: string;
  children?: ReactNode;
}): JSX.Element {
  const router = useRouter();
  const addSite = useGatedAction(
    'properties.create',
    () => {
      void router.push(customerLinks.addSite(customerId));
    },
    'Add site',
  );

  return (
    <button
      type="button"
      aria-disabled={!addSite.allowed}
      onClick={(event) => {
        // Never the row underneath.
        event.stopPropagation();
        addSite.onGatedClick();
      }}
      className={cn(
        'rounded-rf-xs font-medium text-primary-dark hover:underline',
        !addSite.allowed && 'opacity-50',
        className,
      )}
    >
      {children}
    </button>
  );
}

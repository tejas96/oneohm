'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { type JSX, useEffect } from 'react';

import { useProperty } from '../hooks';

import { siteHref } from '@/components/features/customers/lib/site-href';
import { EmptyState } from '@/components/shared';
import { ROUTES } from '@/lib/config/routes';

/**
 * `/properties/<id>` — the old site page's address.
 *
 * The site is now a part of its customer's page, so this only looks up whose
 * site it is and goes there, carrying the old `?tab=` and `?followupId=` along.
 * It must stay: notifications already sent, and bookmarks, hold this address.
 */
export function PropertyRedirect({ propertyId }: { propertyId: string }): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: property, isLoading, isError } = useProperty(propertyId);
  const tab = searchParams.get('tab') ?? undefined;
  const followupId = searchParams.get('followupId') ?? undefined;

  useEffect(() => {
    if (!property) return;
    router.replace(siteHref(property.customerId, property.id, { card: tab, followupId }));
  }, [property, router, tab, followupId]);

  if (!isLoading && (isError || !property)) {
    return (
      <EmptyState
        iconColor="error"
        title="Site not found"
        description="The site you're looking for doesn't exist or has been deleted."
        action={{ label: 'Back to Customers', onClick: () => router.push(ROUTES.CUSTOMERS.LIST) }}
      />
    );
  }

  return (
    <div
      role="status"
      aria-label="Opening the site"
      className="h-40 rounded-rf-xl bg-background-tertiary motion-safe:animate-pulse"
    />
  );
}

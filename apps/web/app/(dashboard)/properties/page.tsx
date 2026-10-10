import { redirect } from 'next/navigation';

import { ROUTES } from '@/lib/config/routes';

type SearchParams = Record<string, string | string[] | undefined>;

function buildQueryString(searchParams: SearchParams): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        qs.append(key, item);
      }
    } else {
      qs.set(key, value);
    }
  }
  return qs.toString();
}

/**
 * `/properties` moved into the customers list; old links land there with
 * their query intact. `searchParams` is a promise in this Next version — read
 * synchronously it has no entries, and every redirect silently lost its query.
 */
export default async function PropertiesRedirectPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<never> {
  const query = buildQueryString(await searchParams);
  redirect(query ? `${ROUTES.CUSTOMERS.LIST}?${query}` : ROUTES.CUSTOMERS.LIST);
}

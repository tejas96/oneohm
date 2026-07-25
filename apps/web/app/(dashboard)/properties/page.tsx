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

export default function PropertiesRedirectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): never {
  const query = buildQueryString(searchParams);
  redirect(query ? `${ROUTES.CUSTOMERS.LIST}?${query}` : ROUTES.CUSTOMERS.LIST);
}

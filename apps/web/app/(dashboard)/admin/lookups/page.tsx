import { type JSX } from 'react';

import { AdminLookupsListPage } from '@/components/features/admin/lookups';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function LookupsPage(): JSX.Element {
  return <AdminLookupsListPage />;
}

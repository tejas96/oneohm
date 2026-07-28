import { redirect } from 'next/navigation';

import { buildRoute, ROUTES } from '@/lib/config/routes';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Superseded by the unified onboarding wizard — kept as a redirect so
 * existing bookmarks/links keep working.
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default async function AddPropertyRoute({ params }: PageProps): Promise<never> {
  const { id } = await params;
  redirect(buildRoute(ROUTES.ONBOARDING.NEW, undefined, { customerId: id }));
}

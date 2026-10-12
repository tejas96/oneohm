import { PropertyRedirect } from '@/components/features/properties';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * The old site page's address. A site is now part of its customer's page.
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default async function PropertyDetailRoute({
  params,
}: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  return <PropertyRedirect propertyId={id} />;
}

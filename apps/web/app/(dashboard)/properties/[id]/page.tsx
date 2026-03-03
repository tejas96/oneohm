import { PropertyDetailPage } from '@/components/features/properties';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Property Detail Page
 * Thin wrapper - all logic in feature component
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default async function PropertyDetailRoute({
  params,
}: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  return <PropertyDetailPage propertyId={id} />;
}

import { CreatePropertyPage } from '@/components/features/properties';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Add Property to Customer Page (context-aware mode)
 * Thin wrapper - all logic in feature component
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default async function AddPropertyRoute({ params }: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  return <CreatePropertyPage customerId={id} />;
}

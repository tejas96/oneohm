import { CustomerDetailPage } from '@/components/features/customers';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Customer Detail Page
 * Thin wrapper - all logic in feature component
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default async function CustomerDetailRoute({
  params,
}: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  return <CustomerDetailPage customerId={id} />;
}

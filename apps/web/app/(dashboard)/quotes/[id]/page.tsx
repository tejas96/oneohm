import { QuoteDetailPage } from '@/components/features/quotes';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Quote Detail Page
 * Thin wrapper - all logic in feature component
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default async function QuoteDetailRoute({ params }: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  return <QuoteDetailPage quoteId={id} />;
}

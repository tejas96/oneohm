import { SiteVisitReport } from '@/components/features/site-visits';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Site Visit Report Page
 * Thin wrapper - all logic in feature component
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default async function SiteVisitDetailRoute({ params }: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  return <SiteVisitReport visitId={id} />;
}

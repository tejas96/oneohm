import { SiteVisitListPage } from '@/components/features/site-visits';

/**
 * Site Visits List Page
 * Thin wrapper - all logic in feature component
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function SiteVisitsPage(): React.JSX.Element {
  return <SiteVisitListPage />;
}

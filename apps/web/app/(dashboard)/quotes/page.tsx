import { QuoteDashboardPage } from '@/components/features/quotes';

/**
 * Quotes Dashboard Page
 * Thin wrapper - all logic in feature component
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function QuotesPage(): React.JSX.Element {
  return <QuoteDashboardPage />;
}

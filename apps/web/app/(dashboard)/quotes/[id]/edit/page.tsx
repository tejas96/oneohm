import { QuoteBuilder } from '@/components/features/quotes';

/**
 * Quote Edit Page
 * Thin wrapper - renders QuoteBuilder for editing an existing quote.
 * QuoteBuilder will be enhanced to accept quoteId prop in a future iteration.
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function QuoteEditRoute(): React.JSX.Element {
  return <QuoteBuilder />;
}

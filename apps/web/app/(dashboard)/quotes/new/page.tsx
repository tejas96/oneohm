import { QuoteBuilder } from '@/components/features/quotes';

/**
 * Quote Builder Page
 * Thin wrapper - all logic in feature component
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function QuoteBuilderPage(): React.JSX.Element {
  return <QuoteBuilder />;
}

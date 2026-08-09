import { ServiceTicketsPage } from '@/components/features/service-tickets';

/**
 * Service Tickets Page
 * Thin wrapper - all logic in feature component
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function ServicePage(): React.JSX.Element {
  return <ServiceTicketsPage />;
}

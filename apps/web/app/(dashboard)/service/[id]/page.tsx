import { ServiceTicketDetailPage } from '@/components/features/service-tickets';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Service Ticket Detail Page
 * Thin wrapper - all logic in feature component
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default async function ServiceTicketRoute({ params }: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  return <ServiceTicketDetailPage ticketId={id} />;
}

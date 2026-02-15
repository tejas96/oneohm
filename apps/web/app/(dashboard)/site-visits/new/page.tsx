import { ScheduleVisitForm } from '@/components/features/site-visits';

/**
 * Schedule Site Visit Page
 * Thin wrapper - all logic in feature component
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function ScheduleVisitPage(): React.JSX.Element {
  return <ScheduleVisitForm />;
}

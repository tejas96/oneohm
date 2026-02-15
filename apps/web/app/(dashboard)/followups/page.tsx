import { FollowupListPage } from '@/components/features/followups';

/**
 * Followups List Page
 * Thin wrapper - all logic in feature component
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function FollowupsPage(): React.JSX.Element {
  return <FollowupListPage />;
}

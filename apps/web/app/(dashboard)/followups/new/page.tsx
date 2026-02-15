import { FollowupForm } from '@/components/features/followups';

/**
 * Create Followup Page
 * Thin wrapper - all logic in feature component
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function CreateFollowupPage(): React.JSX.Element {
  return <FollowupForm />;
}

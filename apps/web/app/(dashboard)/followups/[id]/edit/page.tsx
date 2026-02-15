import { FollowupForm } from '@/components/features/followups';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Edit Followup Page
 * Thin wrapper - all logic in feature component
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default async function EditFollowupPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  return <FollowupForm followupId={id} />;
}

import type { JSX } from 'react';

import { FollowupsPage } from '@/components/features/followups';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function FollowupsRoute(): JSX.Element {
  return <FollowupsPage />;
}

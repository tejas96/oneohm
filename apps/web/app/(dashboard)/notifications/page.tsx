import type { JSX } from 'react';

import { NotificationsPage } from '@/components/features/notifications';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function NotificationsRoute(): JSX.Element {
  return <NotificationsPage />;
}

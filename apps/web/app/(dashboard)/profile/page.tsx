import type { Metadata } from 'next';

import { ProfilePage } from '@/components/features/profile';

export const metadata: Metadata = {
  title: 'My Profile',
  description: 'View and update your employee profile',
};

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function ProfileRoute(): React.JSX.Element {
  return <ProfilePage />;
}

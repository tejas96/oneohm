'use client';

import { useParams } from 'next/navigation';

import { AdminUserDetailPage } from '@/components/features/admin/users';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function AdminUserDetailRoute(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  return <AdminUserDetailPage userId={params.id} />;
}

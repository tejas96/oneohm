'use client';

import { useParams } from 'next/navigation';

import { AdminRoleDetailPage } from '@/components/features/admin/roles';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function AdminRoleDetailRoute(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  return <AdminRoleDetailPage roleId={params.id} />;
}

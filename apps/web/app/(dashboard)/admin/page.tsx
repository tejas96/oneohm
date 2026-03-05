import { redirect } from 'next/navigation';

import { ROUTES } from '@/lib/config/routes';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function AdminPage(): never {
  redirect(ROUTES.ADMIN.USERS);
}

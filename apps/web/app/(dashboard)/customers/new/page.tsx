import { redirect } from 'next/navigation';

import { ROUTES } from '@/lib/config/routes';

/**
 * Superseded by the unified onboarding wizard — kept as a redirect so
 * existing bookmarks/links keep working.
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function CreateCustomerPage(): never {
  redirect(ROUTES.ONBOARDING.NEW);
}

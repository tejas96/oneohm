import { CreatePropertyPage } from '@/components/features/properties';

/**
 * New Property Page (standalone mode)
 * Thin wrapper - all logic in feature component
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function NewPropertyRoute(): React.JSX.Element {
  return <CreatePropertyPage />;
}

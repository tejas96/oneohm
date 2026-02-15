import { PropertyListPage } from '@/components/features/properties';

/**
 * Properties List Page
 * Thin wrapper - all logic in feature component
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function PropertiesPage(): React.JSX.Element {
  return <PropertyListPage />;
}

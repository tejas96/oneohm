import { CustomerListPage } from '@/components/features/customers';

/**
 * Customers List Page
 * Thin wrapper - all logic in feature component
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function CustomersPage(): React.JSX.Element {
  return <CustomerListPage />;
}

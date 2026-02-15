import { CreateCustomerForm } from '@/components/features/customers';

/**
 * Create Customer Page
 * Thin wrapper - all logic in feature component
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function CreateCustomerPage(): React.JSX.Element {
  return <CreateCustomerForm />;
}

import { DashboardPage as DashboardHome } from '@/components/features/dashboard';

/**
 * Dashboard Home Page
 * Thin wrapper - all logic in feature component
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function DashboardPage(): React.JSX.Element {
  return <DashboardHome />;
}

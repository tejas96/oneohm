import { WorkloadPage } from '@/components/features/workload';

/**
 * Department Workload
 * Thin wrapper - all logic in feature component
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function Workload(): React.JSX.Element {
  return <WorkloadPage />;
}

import { FinanceComingSoon } from '@/components/features/finance';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function FinanceOutstandingPage(): React.JSX.Element {
  return (
    <FinanceComingSoon
      title="Outstanding Payment Terms"
      description="Unpaid receivables across all projects, sorted by days overdue. Wires up in slice 7."
    />
  );
}

import { FinanceComingSoon } from '@/components/features/finance';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function FinanceReportsPage(): React.JSX.Element {
  return (
    <FinanceComingSoon
      title="Reports & Exports"
      description="Launchpad of CSV exports — receipts, expenses, AR aging, vendor statement, project profitability. Wires up in slice 10."
    />
  );
}

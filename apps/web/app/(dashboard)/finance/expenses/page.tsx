import { FinanceComingSoon } from '@/components/features/finance';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function FinanceExpensesPage(): React.JSX.Element {
  return (
    <FinanceComingSoon
      title="Expenses"
      description="Org-wide expenses ledger with vendor / category / project filters and CSV export. Wires up in slice 7."
    />
  );
}

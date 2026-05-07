import { FinanceComingSoon } from '@/components/features/finance';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function FinanceReceiptsPage(): React.JSX.Element {
  return (
    <FinanceComingSoon
      title="Receipts"
      description="Org-wide receipts ledger with project + customer columns, filters, and CSV export. Wires up in slice 7."
    />
  );
}

import { FinanceComingSoon } from '@/components/features/finance';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function FinanceVendorsPage(): React.JSX.Element {
  return (
    <FinanceComingSoon
      title="Vendors & Spend"
      description="Per-vendor spend analytics with category breakdown and reimbursement %. Wires up in slice 8."
    />
  );
}

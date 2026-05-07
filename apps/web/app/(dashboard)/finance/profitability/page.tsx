import { FinanceComingSoon } from '@/components/features/finance';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function FinanceProfitabilityPage(): React.JSX.Element {
  return (
    <FinanceComingSoon
      title="Project Profitability"
      description="Per-project quoted revenue vs received vs spent, with margin and BOM variance. Wires up in slice 8."
    />
  );
}

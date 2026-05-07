import { FinanceComingSoon } from '@/components/features/finance';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function FinanceDashboardPage(): React.JSX.Element {
  return (
    <FinanceComingSoon
      title="Finance Dashboard"
      description="Executive overview — KPIs, cash-flow trend, top customers/vendors, recent activity. Wires up in slice 6."
    />
  );
}

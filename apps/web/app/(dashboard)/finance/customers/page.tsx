import { FinanceComingSoon } from '@/components/features/finance';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function FinanceCustomersArPage(): React.JSX.Element {
  return (
    <FinanceComingSoon
      title="Customers AR"
      description="Per-customer AR aging buckets (current, 0-30, 31-60, 61-90, 90+). Wires up in slice 8."
    />
  );
}

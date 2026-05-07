import { FinanceComingSoon } from '@/components/features/finance';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function FinanceCalendarPage(): React.JSX.Element {
  return (
    <FinanceComingSoon
      title="Dues Calendar"
      description="Grouped list of upcoming and overdue payment terms (Overdue / Today / Tomorrow / This Week / Next Week / Later). Wires up in slice 10."
    />
  );
}

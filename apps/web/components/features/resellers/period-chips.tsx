'use client';

import { type JSX } from 'react';

import { PillTabs } from '@/components/shared/calm-list';
import type { ResellerPeriod } from '@/lib/hooks/resources/resellers';

const PERIODS: ReadonlyArray<{ value: ResellerPeriod; label: string }> = [
  { value: 'month', label: 'This month' },
  { value: 'fy', label: 'This FY' },
  { value: 'all', label: 'All time' },
];

/** The period the funnel and the revenue are counted over, and what that means. */
export function PeriodChips({
  value,
  onChange,
}: {
  value: ResellerPeriod;
  onChange: (p: ResellerPeriod) => void;
}): JSX.Element {
  return (
    <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-2">
      <PillTabs label="Period" options={PERIODS} value={value} onChange={onChange} />
      <span className="text-[12px] text-foreground-tertiary">
        Leads and win rate count by lead date. Revenue counts by the date the deal was won.
      </span>
    </div>
  );
}

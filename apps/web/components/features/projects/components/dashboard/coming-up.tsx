'use client';

import type { DashboardFinancing, ProjectsDashboard } from '@tejas96/shared/types';
import Link from 'next/link';
import * as React from 'react';

import { dashboardLinks } from './links';

import { AnimatedNumber, ENTER, enterDelay, formatKw } from '@/components/features/dashboard/kit';
import { cn } from '@/lib/utils';

/** Meters due in 30 days. Due dates are schedule estimates, so the card says "planned". */
export function ComingUp({
  data,
  financing,
}: {
  data: ProjectsDashboard;
  financing: DashboardFinancing;
}): React.JSX.Element {
  const c = data.comingUp;
  return (
    <section className={cn('rounded-xl bg-surface p-5 shadow-e2', ENTER)} style={enterDelay(9)}>
      <header className="flex items-baseline justify-between gap-2 pb-2">
        <h2 className="text-sm font-semibold text-foreground">Coming up · 30 days</h2>
        <span className="text-2xs text-foreground-tertiary">planned</span>
      </header>
      <Link
        href={dashboardLinks.meterDue(c.from, c.to, financing)}
        className="block text-2xl font-semibold tabular-nums text-foreground hover:text-primary-dark"
      >
        <AnimatedNumber value={c.count} />
      </Link>
      <p className="text-xs text-foreground-tertiary">
        {c.count === 1 ? 'meter' : 'meters'} due · {formatKw(c.kw)}
      </p>
      <ul className="mt-3 divide-y divide-border text-sm">
        <li>
          <Link
            href={dashboardLinks.meterDue(c.from, c.thisWeekTo, financing)}
            className="flex justify-between py-2 hover:text-primary-dark"
          >
            <span className="text-foreground-secondary">This week</span>
            <span className="tabular-nums">{c.thisWeek}</span>
          </Link>
        </li>
        <li>
          <Link
            href={dashboardLinks.meterDue(c.nextWeekFrom, c.nextWeekTo, financing)}
            className="flex justify-between py-2 hover:text-primary-dark"
          >
            <span className="text-foreground-secondary">Next week</span>
            <span className="tabular-nums">{c.nextWeek}</span>
          </Link>
        </li>
      </ul>
    </section>
  );
}

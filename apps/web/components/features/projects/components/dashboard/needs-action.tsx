'use client';

import type { DashboardFinancing, ProjectsDashboard } from '@tejas96/shared/types';
import Link from 'next/link';
import * as React from 'react';

import { dashboardLinks } from './links';
import { ENTER, enterDelay } from './motion';

import { cn } from '@/lib/utils';

export function NeedsAction({
  data,
  financing,
}: {
  data: ProjectsDashboard;
  financing: DashboardFinancing;
}): React.JSX.Element {
  const { rows, total } = data.needsAction;
  return (
    <section className={cn('rounded-xl bg-surface p-5 shadow-e2', ENTER)} style={enterDelay(6)}>
      <header className="flex items-baseline justify-between gap-2 pb-2">
        <h2 className="text-sm font-semibold text-foreground">Needs action</h2>
        <span className="text-2xs text-foreground-tertiary">most late first</span>
      </header>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-secondary">Nothing is late.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row, i) => (
            <li key={row.taskId} className={ENTER} style={enterDelay(i, 40)}>
              <Link
                href={dashboardLinks.task(row.projectId, row.taskId)}
                className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 hover:bg-surface-alt"
              >
                <span className="min-w-0">
                  <span
                    className="block truncate text-sm text-foreground"
                    title={row.customerName ?? row.projectNumber}
                  >
                    {row.customerName ?? row.projectNumber}
                  </span>
                  <span className="block truncate text-xs text-foreground-tertiary">
                    {row.stepName}
                    {row.department ? ` · ${row.department.replace(/ Department$/, '')}` : ''}
                    {' · '}
                    {row.assigneeName ?? <span className="text-error">Unassigned</span>}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-medium tabular-nums text-error">
                  {row.daysLate} d late
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {total > rows.length ? (
        <Link
          href={dashboardLinks.attention('late_steps', financing)}
          className="mt-3 inline-block text-xs font-medium text-primary-dark hover:underline"
        >
          See all {total} →
        </Link>
      ) : null}
    </section>
  );
}

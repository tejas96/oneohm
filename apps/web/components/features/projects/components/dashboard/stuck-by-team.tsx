'use client';

import type { DashboardFinancing, ProjectsDashboard } from '@tejas96/shared/types';
import Link from 'next/link';
import * as React from 'react';

import { dashboardLinks } from './links';

import { ENTER, enterDelay } from '@/components/features/dashboard/kit';
import { cn } from '@/lib/utils';

/**
 * Late steps per department. "Other" (steps with no department) links to the
 * project list instead: /workload drops those steps, so it would show nothing.
 */
export function StuckByTeam({
  data,
  financing,
}: {
  data: ProjectsDashboard;
  financing: DashboardFinancing;
}): React.JSX.Element {
  const max = Math.max(1, ...data.teams.map((t) => t.lateSteps));
  return (
    <section className={cn('rounded-xl bg-surface p-5 shadow-e2', ENTER)} style={enterDelay(7)}>
      <header className="flex items-baseline justify-between gap-2 pb-2">
        <h2 className="text-sm font-semibold text-foreground">Stuck by team</h2>
        <span className="text-2xs text-foreground-tertiary">late steps</span>
      </header>
      {financing !== 'all' ? (
        <p className="pb-2 text-xs text-foreground-tertiary">Workload shows all projects.</p>
      ) : null}
      {data.teams.length === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-secondary">No late steps.</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.teams.map((team) => (
            <li key={team.department}>
              <Link
                href={
                  team.department === 'Other'
                    ? dashboardLinks.attention('late_steps', financing)
                    : dashboardLinks.workload(team.department)
                }
                className="-mx-2 grid grid-cols-[minmax(0,1fr)_96px_32px] items-center gap-3 rounded-md px-2 py-2.5 text-sm hover:bg-surface-alt"
              >
                <span className="truncate text-foreground">
                  {team.department.replace(/ Department$/, '')}
                </span>
                <span className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
                  <span
                    className="block h-full rounded-full bg-error transition-[width] duration-700 ease-out motion-reduce:transition-none"
                    style={{ width: `${(team.lateSteps / max) * 100}%` }}
                  />
                </span>
                <span className="text-right tabular-nums text-foreground">{team.lateSteps}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

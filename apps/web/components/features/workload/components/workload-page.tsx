'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { rupeesShort } from '@/components/features/dashboard/business/lib/format';
import { Typography } from '@/components/ui';
import { CHART_COLORS } from '@/lib/charts/palette';
import {
  useWorkload,
  useWorkloadBottlenecks,
  type WorkloadBottleneck,
  type WorkloadDepartment,
} from '@/lib/hooks/resources/workload';
import { useCan } from '@/lib/rbac';
import { color } from '@/lib/theme/tokens';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

const ALL = 'all';

/** The month so far, matching the endpoint's own fallback and Business mode. */
function monthSoFar(now: Date): { from: string; to: string; label: string } {
  const pad = (n: number): string => String(n).padStart(2, '0');
  const y = now.getFullYear();
  const m = now.getMonth();
  return {
    from: `${y}-${pad(m + 1)}-01`,
    to: `${y}-${pad(m + 1)}-${pad(now.getDate())}`,
    label: `1–${now.getDate()} ${now.toLocaleDateString('en-IN', { month: 'short' })} ${y}`,
  };
}

const GRID = 'grid grid-cols-[minmax(0,1fr)_84px_84px_84px_110px] items-center gap-x-4';

/**
 * Colour only once a step is meaningfully past its budget.
 *
 * Everything here runs over — tinting all of it red would make the column one
 * flat colour and say nothing. Amber at 3x, red at 10x, plain below that.
 */
function overdueTone(actual: number, standard: number | null): string {
  if (!standard) return color['text-primary'];
  const ratio = actual / standard;
  if (ratio >= 10) return color.danger;
  if (ratio >= 3) return color.warning;
  return color['text-primary'];
}

function DepartmentBlock({ dept }: { dept: WorkloadDepartment }): React.JSX.Element {
  const busiest = Math.max(...dept.steps.map((s) => s.pending), 1);

  return (
    <section className="rounded-3xl bg-surface px-[22px] pb-4 pt-5 shadow-e2">
      <div className="flex items-baseline gap-3 pb-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground-secondary">
          {dept.department}
        </h2>
        <span className="text-[12px] text-foreground-tertiary">
          {dept.pending} pending · {dept.completed} completed
        </span>
      </div>

      <div
        className={cn(
          GRID,
          'pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-foreground-tertiary',
        )}
      >
        <div>Step</div>
        <div className="text-right">Pending</div>
        <div className="text-right">Completed</div>
        <div className="text-right">Standard</div>
        <div className="text-right">Open for</div>
      </div>

      {dept.steps.map((step) => (
        <div key={step.stepId} className={cn(GRID, 'h-9')}>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="truncate text-[13px]">{step.stepName}</span>
            <span
              className="h-1.5 shrink-0 rounded-pill"
              style={{
                width: `${Math.max(2, (step.pending / busiest) * 56).toFixed(1)}px`,
                background: CHART_COLORS[2],
              }}
              aria-hidden="true"
            />
          </div>
          <div className="text-right text-[13px] font-medium tabular-nums">{step.pending}</div>
          <div className="text-right text-[13px] tabular-nums text-foreground-secondary">
            {step.completed}
            {step.completed === 0 && step.completedAllTime > 0 ? (
              // A zero inside a thin window reads as "this step never runs".
              // The all-time figure says otherwise without inflating the column.
              <span className="ml-1 text-[11px] text-foreground-tertiary">
                ({step.completedAllTime} ever)
              </span>
            ) : null}
          </div>
          <div className="text-right text-[12.5px] tabular-nums text-foreground-tertiary">
            {step.standardDays === null ? '—' : `${step.standardDays}d`}
          </div>
          <div className="text-right tabular-nums">
            {step.avgDaysOpen === null ? (
              <span className="text-[12.5px] text-foreground-tertiary">—</span>
            ) : (
              <>
                <span
                  className="text-[13px] font-medium"
                  style={{ color: overdueTone(step.avgDaysOpen, step.standardDays) }}
                >
                  {step.avgDaysOpen}d
                </span>
                {/* The multiple is the point. "78 days" is a number; "78x the
                    standard" is a decision. Only shown when there is a standard
                    to divide by — a 0-day standard would produce infinity. */}
                {step.standardDays ? (
                  <span className="ml-1 text-[11px] text-foreground-tertiary">
                    {Math.round(step.avgDaysOpen / step.standardDays)}×
                  </span>
                ) : null}
              </>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}


/**
 * Where the money is stuck.
 *
 * The client asked for throughput. This answers the question underneath it:
 * which bottleneck is sitting on the most unpaid work. A project is attributed
 * to its earliest incomplete step, and that step carries everything the project
 * still owes.
 *
 * Rendered only with `finance.view`. Workload access alone should not reveal
 * what the organisation is owed.
 */
function BottlenecksPanel({
  bottlenecks,
  totalOwed,
}: {
  bottlenecks: WorkloadBottleneck[];
  totalOwed: number;
}): React.JSX.Element | null {
  if (bottlenecks.length === 0) return null;
  const denominator = totalOwed || 1;

  return (
    <section className="rounded-3xl bg-surface px-[22px] pb-4 pt-5 shadow-e2">
      <div className="flex items-baseline gap-3 pb-1">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground-secondary">
          Money behind the bottleneck
        </h2>
        <span className="text-[12px] text-foreground-tertiary">
          {rupeesShort(totalOwed)} owed across every blocked project
        </span>
      </div>
      <p className="pb-4 text-[11.5px] text-foreground-tertiary">
        Each project counts once, against the earliest step it has not finished.
      </p>

      {bottlenecks.map((b) => {
        const share = (b.amountOwed / denominator) * 100;
        return (
          <div
            key={b.stepId}
            className="grid h-[46px] grid-cols-[minmax(0,1fr)_92px_minmax(0,150px)_120px] items-center gap-x-4"
          >
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium tracking-[-0.01em]">
                {b.stepName}
              </div>
              <div className="text-[11px] text-foreground-tertiary">
                {b.department.replace(/ Department$/, '')}
              </div>
            </div>
            <div className="text-right text-[12.5px] tabular-nums text-foreground-secondary">
              {b.projectsStuck} project{b.projectsStuck === 1 ? '' : 's'}
            </div>
            <div className="flex h-[18px] items-center">
              <div
                className="h-[18px] rounded-pill"
                style={{
                  width: `${Math.max(2, share).toFixed(1)}%`,
                  background: share >= 25 ? color.danger : CHART_COLORS[3],
                }}
              />
            </div>
            <div className="text-right">
              <div className="text-[14px] font-medium tabular-nums">
                {rupeesShort(b.amountOwed)}
              </div>
              <div className="text-[11px] tabular-nums text-foreground-tertiary">
                {share.toFixed(0)}% of the total
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

/**
 * Department workload — every workflow step, grouped by the team that owns it.
 *
 * Phase 1 of the client's request. Their third column, average time taken
 * against the standard, is absent on purpose: task start times exist for 0.4%
 * of completed work, so the actual half cannot be computed. `Standard` is shown
 * alone rather than beside a fabricated actual.
 *
 * Filters live in the URL so a filtered view can be sent to someone.
 */
export function WorkloadPage(): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const range = React.useMemo(() => monthSoFar(new Date()), []);
  const department = searchParams.get('department') ?? ALL;

  // The route gate decides whether this page renders, but it resolves on the
  // client and the permissions behind it come from localStorage until /auth/me
  // answers. Without this the query fires during that window and pulls
  // org-wide workload into the browser of someone the gate is about to refuse.
  const { can } = useCan();
  const { permissionsConfirmed } = useAuth();
  const mayFetch = permissionsConfirmed && can('workload.view');
  // Receivables, so it needs the finance code on top of workload access.
  const showMoney = mayFetch && can('finance.view');

  const { data, isPending, isError, refetch } = useWorkload(
    {
      fromDate: range.from,
      toDate: range.to,
      department: department === ALL ? undefined : department,
    },
    { enabled: mayFetch },
  );

  const bottlenecks = useWorkloadBottlenecks({ enabled: showMoney });

  const setDepartment = (next: string): void => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === ALL) params.delete('department');
    else params.set('department', next);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  // Built from the response so the filter can never offer a department the
  // data does not contain. Absent while filtered, so the current value is kept.
  const options = React.useMemo(() => {
    const names = (data?.departments ?? []).map((d) => d.department);
    return department === ALL ? names : [...new Set([department, ...names])];
  }, [data, department]);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl bg-surface px-[26px] py-6 shadow-e2">
        <Typography variant="h2">Department workload</Typography>
        <p className="mt-2 max-w-[640px] text-[13.5px] text-foreground-secondary">
          Open and completed tasks for every workflow step, by the team that owns it. Pending is as
          of now; completed covers {range.label}.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {[ALL, ...options].map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setDepartment(name)}
              className={cn(
                'h-8 rounded-pill px-3.5 text-[12.5px] font-medium transition-colors',
                name === department
                  ? 'bg-primary-dark text-white'
                  : 'bg-background-tertiary text-foreground-secondary hover:text-foreground',
              )}
            >
              {name === ALL ? 'All departments' : name.replace(/ Department$/, '')}
            </button>
          ))}
        </div>

        {data ? (
          <p className="mt-4 text-[13px] text-foreground-secondary">
            <span className="font-medium tabular-nums">{data.totalPending}</span> pending ·{' '}
            <span className="tabular-nums">{data.totalCompleted}</span> completed
          </p>
        ) : null}
      </section>

      {showMoney && bottlenecks.data ? (
        <BottlenecksPanel
          bottlenecks={bottlenecks.data.bottlenecks}
          totalOwed={bottlenecks.data.totalOwed}
        />
      ) : null}

      {isError ? (
        <section className="rounded-3xl bg-surface px-[22px] py-8 shadow-e2">
          <p className="text-[13.5px] text-foreground-secondary">
            Workload didn&apos;t load.{' '}
            <button type="button" onClick={() => void refetch()} className="text-secondary underline">
              Try again
            </button>
          </p>
        </section>
      ) : isPending ? (
        <section className="rounded-3xl bg-surface px-[22px] py-8 shadow-e2">
          <p className="text-[13.5px] text-foreground-tertiary">Loading workload…</p>
        </section>
      ) : (
        (data?.departments ?? []).map((dept) => (
          <DepartmentBlock key={dept.department} dept={dept} />
        ))
      )}
    </div>
  );
}

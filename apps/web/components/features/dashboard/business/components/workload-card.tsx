'use client';

import * as React from 'react';

import { BusinessCard } from './business-card';
import { GatedLink } from './gated-link';
import { businessLinks } from '../lib/links';

import { CHART_COLORS } from '@/lib/charts/palette';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import type { WorkloadDepartment } from '@/lib/hooks/resources/workload';

interface WorkloadCardProps {
  departments: WorkloadDepartment[];
  totalPending: number;
  rangeLabel: string;
  isError: boolean;
  onRetry: () => void;
}

/**
 * How much work each department is carrying.
 *
 * Four rows, not forty-four. The client's request lists every workflow step,
 * but this page is read in ninety seconds and a step-level grid is a table —
 * it lives at `/workload`, and each row here opens that screen filtered to the
 * department.
 *
 * The bar is share of the total pending backlog, not progress. A department
 * with more open work draws a longer bar; nothing here implies completion.
 */
export function WorkloadCard({
  departments,
  totalPending,
  rangeLabel,
  isError,
  onRetry,
}: WorkloadCardProps): React.JSX.Element {
  const denominator = totalPending || 1;

  return (
    <BusinessCard
      label="Department workload"
      aside={`Completed ${rangeLabel}`}
      isError={isError}
      onRetry={onRetry}
      errorHeight={200}
      link={{ gate: 'workload.view', label: 'Open workload', href: ROUTES.WORKLOAD.HOME }}
    >
      {departments.length === 0 ? (
        <p className="pb-2 pt-0.5 text-[13.5px] text-foreground-tertiary">
          No departmental work recorded yet.
        </p>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)_74px_minmax(0,120px)_74px] items-center gap-x-3.5 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-foreground-tertiary">
          <div>Department</div>
          <div className="text-right">Pending</div>
          <div />
          <div className="text-right">Completed</div>
        </div>
      )}

      {departments.map((dept) => (
        <GatedLink
          key={dept.department}
          gate="workload.view"
          subject={dept.department}
          href={buildRoute(ROUTES.WORKLOAD.HOME, undefined, { department: dept.department })}
          className="-mx-2.5 grid h-[42px] grid-cols-[minmax(0,1fr)_74px_minmax(0,120px)_74px] items-center gap-x-3.5 rounded-[10px] px-2.5 hover:bg-background-tertiary"
        >
          <span className="truncate text-[13px] font-medium tracking-[-0.01em]">
            {/* "Execution Department" reads as "Execution" in a column headed
                Department — the suffix is noise once the header says it. */}
            {dept.department.replace(/ Department$/, '')}
          </span>
          <span className="text-right text-[14px] font-medium tabular-nums">{dept.pending}</span>
          <span className="flex h-[22px] items-center">
            <span
              className="h-[22px] rounded-pill"
              style={{
                width: `${Math.max(2, (dept.pending / denominator) * 100).toFixed(1)}%`,
                background: CHART_COLORS[2],
              }}
            />
          </span>
          <span className="text-right text-[13px] tabular-nums text-foreground-secondary">
            {dept.completed}
          </span>
        </GatedLink>
      ))}
    </BusinessCard>
  );
}

export { businessLinks };

'use client';

import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_CATALOG,
  TASK_STATUS_OPTIONS,
} from '@tejas96/shared/constants';
import type { TaskStatus } from '@tejas96/shared/types';
import { CircleCheck } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { PRIORITY_TONE } from '../../lib/derive';
import { CardLink, DetailCard, EmptyPane, Mono, Overline, TONE, type Tone } from '../../primitives';
import type { Panel } from '../../types';

import { Skeleton } from '@/components/ui/skeleton';
import type { ProjectSummary } from '@/lib/hooks/resources';
import { buildTasksTabUrl, cn, formatNumber } from '@/lib/utils';

/**
 * Status colour comes from the shared task catalog's `variant`, the same field
 * the task badges and the board columns paint from. Tying the tone to it means
 * a status can never read blue here and grey in the list.
 */
const VARIANT_TONE: Record<string, Tone> = {
  secondary: 'neutral',
  info: 'info',
  warning: 'warning',
  error: 'danger',
  success: 'success',
};

function statusTone(code: string): Tone {
  const variant = TASK_STATUS_CATALOG[code as TaskStatus]?.variant;
  return (variant ? VARIANT_TONE[variant] : undefined) ?? 'neutral';
}

/** Every state a task can sit in while it is still work. `done` is excluded. */
const OPEN_STATUS_OPTIONS = TASK_STATUS_OPTIONS.filter(
  (option) => !TASK_STATUS_CATALOG[option.value]?.isFinal,
);

interface Row {
  code: string;
  label: string;
  count: number;
  tone: Tone;
  href: string;
}

interface OpenWorkCardProps {
  summary: Panel<ProjectSummary>;
  projectPath: string;
  className?: string;
}

function StatRow({
  row,
  trailing,
  labelWidth,
  bar,
}: {
  row: Row;
  trailing: React.ReactNode;
  labelWidth?: string;
  bar?: React.ReactNode;
}): React.JSX.Element {
  return (
    <li>
      <Link
        href={row.href}
        className="-mx-1.5 flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors duration-fast hover:bg-background-tertiary focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
      >
        {bar ? null : (
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ background: TONE[row.tone].ink }}
          />
        )}
        <span
          className={cn(
            'truncate text-[12.5px]',
            labelWidth ? `${labelWidth} shrink-0` : 'min-w-0 flex-1',
            row.count > 0 ? 'text-foreground' : 'text-foreground-tertiary',
          )}
        >
          {row.label}
        </span>
        {bar}
        {trailing}
      </Link>
    </li>
  );
}

/**
 * The pile that is left, and what shape it is in.
 *
 * Deliberately excludes finished tasks: the header already states how many of
 * how many are done, and repeating it here would be the same fact twice. What
 * has no home anywhere else is the split of the *remaining* work — how much
 * has not been picked up, how much is moving, how much is stuck — and the
 * priority mix, which appears nowhere else in the product.
 *
 * Two devices on purpose. State is a composition of one pile, so it is one
 * bar. Priority is an ordered scale, so it is ranked rows measured against the
 * largest; five slivers of a shared bar would be unreadable.
 */
export function OpenWorkCard({
  summary,
  projectPath,
  className,
}: OpenWorkCardProps): React.JSX.Element {
  const statusRows = React.useMemo<Row[]>(() => {
    const byStatus = summary.data?.tasksByStatus ?? {};
    return OPEN_STATUS_OPTIONS.map((option) => ({
      code: option.value,
      label: option.label,
      count: byStatus[option.value] ?? 0,
      tone: statusTone(option.value),
      href: buildTasksTabUrl(projectPath, { status: option.value }),
    }));
  }, [summary.data?.tasksByStatus, projectPath]);

  const priorityRows = React.useMemo<Row[]>(() => {
    const byPriority = summary.data?.tasksByPriority ?? {};
    return TASK_PRIORITY_OPTIONS.map((option) => ({
      code: option.value,
      label: option.label,
      count: byPriority[option.value] ?? 0,
      tone: PRIORITY_TONE[option.value] ?? 'neutral',
      href: buildTasksTabUrl(projectPath, { priority: option.value }),
    }));
  }, [summary.data?.tasksByPriority, projectPath]);

  // Denominator is the sum of the rows actually drawn, so the bar always fills
  // and the percentages always total 100 — even if the API ever returns a
  // status this build does not know about.
  const openTotal = statusRows.reduce((sum, row) => sum + row.count, 0);
  const allTotal = summary.data?.metrics.totalTasks ?? 0;
  const priorityMax = Math.max(...priorityRows.map((row) => row.count), 0);

  return (
    <DetailCard
      label="Open work"
      aside={summary.data ? `${formatNumber(openTotal)} of ${formatNumber(allTotal)}` : undefined}
      action={<CardLink href={buildTasksTabUrl(projectPath)}>Open tasks</CardLink>}
      isError={summary.isError}
      onRetry={summary.refetch}
      className={className}
    >
      {summary.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-2.5 w-full rounded-pill" />
          <div className="space-y-1.5">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-5 rounded-md" />
            ))}
          </div>
          <Skeleton className="h-3 w-24 rounded-md" />
          <div className="space-y-1.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-5 rounded-md" />
            ))}
          </div>
        </div>
      ) : allTotal === 0 ? (
        <EmptyPane
          title="No tasks yet"
          description="Tasks arrive with the workflow when the project starts."
        />
      ) : (
        <>
          {openTotal === 0 ? (
            <EmptyPane
              icon={<CircleCheck className="size-4" strokeWidth={2} />}
              tone="success"
              title="Everything is done"
              description={`All ${formatNumber(allTotal)} tasks on this project are finished.`}
            />
          ) : (
            <>
              <div
                className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-pill"
                style={{ background: 'var(--ds-canvas-sunken)' }}
                role="img"
                aria-label={statusRows
                  .filter((row) => row.count > 0)
                  .map((row) => `${row.label} ${row.count}`)
                  .join(', ')}
              >
                {statusRows
                  .filter((row) => row.count > 0)
                  .map((row) => (
                    <span
                      key={row.code}
                      style={{
                        width: `${(row.count / openTotal) * 100}%`,
                        background: TONE[row.tone].ink,
                      }}
                    />
                  ))}
              </div>

              <ul className="mt-2.5 flex flex-col">
                {statusRows.map((row) => (
                  <StatRow
                    key={row.code}
                    row={row}
                    trailing={
                      <>
                        <Mono
                          className={cn(
                            'text-[12.5px]',
                            row.count > 0
                              ? 'font-medium text-foreground'
                              : 'text-foreground-tertiary',
                          )}
                        >
                          {row.count}
                        </Mono>
                        <Mono className="w-9 shrink-0 text-right text-[11px] text-foreground-tertiary">
                          {Math.round((row.count / openTotal) * 100)}%
                        </Mono>
                      </>
                    }
                  />
                ))}
              </ul>
            </>
          )}

          {/* Scope is stated because the API counts priority across every task,
              finished ones included — it has no per-status priority split. */}
          <Overline as="h3" className="mt-4 pb-1">
            Priority
            <span className="ml-1.5 font-medium normal-case tracking-normal text-foreground-tertiary">
              all {formatNumber(allTotal)} tasks
            </span>
          </Overline>
          <ul className="flex flex-col">
            {priorityRows.map((row) => (
              <StatRow
                key={row.code}
                row={row}
                labelWidth="w-[52px]"
                bar={
                  <span
                    aria-hidden
                    className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-pill"
                    style={{ background: 'var(--ds-canvas-sunken)' }}
                  >
                    <span
                      className="block h-full rounded-pill"
                      style={{
                        width: priorityMax > 0 ? `${(row.count / priorityMax) * 100}%` : '0%',
                        background: TONE[row.tone].ink,
                      }}
                    />
                  </span>
                }
                trailing={
                  <Mono
                    className={cn(
                      'w-6 shrink-0 text-right text-[11.5px]',
                      row.count > 0 ? 'text-foreground' : 'text-foreground-tertiary',
                    )}
                  >
                    {row.count}
                  </Mono>
                }
              />
            ))}
          </ul>
        </>
      )}
    </DetailCard>
  );
}

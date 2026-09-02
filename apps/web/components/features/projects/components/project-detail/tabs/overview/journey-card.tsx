'use client';

import { Check, CircleDot, Circle, TriangleAlert } from 'lucide-react';
import * as React from 'react';

import type { MilestoneAggregateItem, ProjectDetail } from '../../../../hooks/types';
import {
  computeClock,
  computeJourney,
  computePace,
  currentPhaseIndex,
  milestoneTasksHref,
  PHASE_STATUS_LABEL,
  phaseTone,
  plural,
  sortPhases,
  type Pace,
} from '../../lib/derive';
import {
  DetailCard,
  EmptyPane,
  IconCircle,
  Mono,
  RowLink,
  TONE,
  TonePill,
  Track,
  type Tone,
} from '../../primitives';
import type { Panel } from '../../types';

import { Skeleton } from '@/components/ui/skeleton';
import type { ProjectSummary } from '@/lib/hooks/resources';
import { cn, formatDate, formatNumber } from '@/lib/utils';

interface JourneyCardProps {
  project: ProjectDetail;
  milestones: Panel<MilestoneAggregateItem[]>;
  /** Supplies the authoritative task totals — see the note in the component. */
  summary: Panel<ProjectSummary>;
  projectPath: string;
  className?: string;
}

const WORK_INK = 'var(--ds-accent-ink)';
const TIME_INK = 'var(--ds-secondary)';

function paceChip(pace: Pace): { label: string; tone: Tone } {
  if (pace.kind === 'on_pace') return { label: 'On pace with the clock', tone: 'accent' };
  const pts = `${pace.points} ${plural(pace.points, 'point')}`;
  if (pace.kind === 'ahead') return { label: `Ahead of the clock by ${pts}`, tone: 'success' };
  return {
    label: `Behind the clock by ${pts}`,
    tone: pace.points >= 20 ? 'danger' : 'warning',
  };
}

function PhaseIcon({ status }: { status: MilestoneAggregateItem['status'] }): React.JSX.Element {
  const cls = 'size-3';
  switch (status) {
    case 'completed':
      return <Check className={cls} strokeWidth={3} />;
    case 'blocked':
      return <TriangleAlert className={cls} strokeWidth={2.25} />;
    case 'in_progress':
      return <CircleDot className={cls} strokeWidth={2.25} />;
    case 'pending':
    case 'no_tasks':
      return <Circle className={cls} strokeWidth={2.25} />;
  }
}

/**
 * The work, drawn to scale, against the clock.
 *
 * Both marks share ONE scale: percent complete. Segment width is the phase's
 * share of the tasks; the green fill is tasks actually done; the beacon sits at
 * that exact point. The dashed blue line is time used. Because both are
 * percentages, the gap between them IS the answer to "are we on track" —
 * beacon right of the line means ahead, left means behind. Nothing here is
 * positioned by a fake date.
 */
export function JourneyCard({
  project,
  milestones,
  summary,
  projectPath,
  className,
}: JourneyCardProps): React.JSX.Element {
  const phases = React.useMemo(() => sortPhases(milestones.data), [milestones.data]);
  const journey = React.useMemo(() => computeJourney(phases), [phases]);
  const clock = React.useMemo(() => computeClock(project), [project]);
  const nowIndex = currentPhaseIndex(phases);

  /*
   * The headline counts come from the SUMMARY, not from the phases.
   *
   * `GET /milestones` groups tasks by their milestone name, so any task with no
   * phase is missing from it entirely. On a real project that made this card
   * read "38 of 43 tasks, 88%" directly under a header saying "39 of 44 tasks
   * done, 89%" — the same fact, two numbers, one screen apart.
   *
   * Segment widths still come from the phases, because a segment IS a phase.
   * When the two totals differ, the note under the legend says why.
   */
  const metrics = summary.data?.metrics;
  const totalTasks = metrics?.totalTasks ?? journey.totalTasks;
  const doneTasks = metrics?.completedTasks ?? journey.doneTasks;
  const workPct = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;
  const unphasedTasks = Math.max(0, totalTasks - journey.totalTasks);

  const pace = clock && totalTasks > 0 ? computePace(workPct, clock.elapsedPct) : null;
  const chip = pace ? paceChip(pace) : null;

  const aside =
    phases.length > 0 ? `${phases.length} ${plural(phases.length, 'phase')}` : undefined;

  return (
    <DetailCard
      label="Project journey"
      aside={aside}
      action={chip ? <TonePill label={chip.label} tone={chip.tone} dot /> : null}
      isError={milestones.isError}
      onRetry={milestones.refetch}
      errorHeight={140}
      className={className}
    >
      {milestones.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-full rounded-pill" />
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-8 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : phases.length === 0 ? (
        <EmptyPane
          title="No phases yet"
          description="Phases appear as tasks are added to this project. The plan will draw itself here."
        />
      ) : (
        <>
          {/* ── The track ── */}
          <div className="relative pt-7">
            {clock ? (
              <div
                className="absolute top-0 z-10 -translate-x-1/2"
                style={{ left: `${clock.elapsedPct}%` }}
                aria-hidden
              >
                <span
                  className="inline-block whitespace-nowrap rounded-pill px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.08em]"
                  style={{ background: TONE.info.tint, color: TONE.info.ink }}
                >
                  Today · {formatDate(new Date(), 'short')}
                </span>
                <span
                  className="mx-auto block h-[34px] w-0 border-l-2 border-dashed"
                  style={{ borderColor: TIME_INK }}
                />
              </div>
            ) : null}

            <div
              className="relative flex h-[22px] gap-[2px] overflow-hidden rounded-pill bg-surface"
              role="img"
              aria-label={`Project journey. ${doneTasks} of ${totalTasks} tasks done, ${Math.round(workPct)} percent.${
                clock
                  ? ` ${clock.elapsedDays} of ${clock.totalDays} days used, ${Math.round(clock.elapsedPct)} percent.`
                  : ''
              }${nowIndex >= 0 ? ` Currently in ${phases[nowIndex]?.name ?? ''}.` : ' Every phase is complete.'}`}
            >
              {journey.segments.map((segment, index) => {
                const isNow = index === nowIndex;
                const remainderTint =
                  segment.status === 'blocked'
                    ? TONE.danger.tint
                    : isNow
                      ? TONE.accent.tint
                      : 'var(--ds-canvas-sunken)';
                return (
                  <div
                    key={segment.key}
                    className="relative h-full"
                    style={{
                      flexGrow: segment.widthPct,
                      flexBasis: 0,
                      minWidth: 3,
                      background: remainderTint,
                    }}
                    title={`${segment.name} — ${segment.done}/${segment.total} done`}
                  >
                    <div
                      className="h-full"
                      style={{ width: `${segment.donePct}%`, background: WORK_INK }}
                    />
                  </div>
                );
              })}
            </div>

            {/* The beacon — where the work actually is. */}
            <div
              className="pointer-events-none absolute z-20 -translate-x-1/2"
              style={{ left: `${workPct}%`, top: 'calc(1.75rem + 11px)' }}
              aria-hidden
            >
              <span className="relative block size-[14px] -translate-y-1/2">
                <span
                  className="absolute inset-0 rounded-full motion-safe:animate-attention-ripple"
                  style={{ background: WORK_INK }}
                />
                <span
                  className="absolute inset-0 rounded-full ring-2 ring-white"
                  style={{ background: WORK_INK }}
                />
              </span>
            </div>

            {/* Phase names under the segments they own — only where they fit. */}
            <div className="relative mt-1.5 h-4">
              {journey.segments.map((segment, index) =>
                segment.widthPct >= 9 ? (
                  <span
                    key={segment.key}
                    className={cn(
                      'absolute top-0 truncate px-1 text-[10.5px] leading-4',
                      index === nowIndex
                        ? 'font-bold text-primary-dark'
                        : 'text-foreground-tertiary',
                    )}
                    style={{ left: `${segment.startPct}%`, width: `${segment.widthPct}%` }}
                    title={segment.name}
                  >
                    {segment.name}
                  </span>
                ) : null,
              )}
            </div>
          </div>

          {/* ── Legend ── */}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11.5px] text-foreground-secondary">
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2.5 rounded-[3px]"
                style={{ background: WORK_INK }}
              />
              Work ·{' '}
              <Mono className="font-medium text-foreground">
                {formatNumber(doneTasks)} of {formatNumber(totalTasks)} tasks, {Math.round(workPct)}
                %
              </Mono>
            </span>
            {clock ? (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-0 w-3 border-t-2 border-dashed"
                    style={{ borderColor: TIME_INK }}
                  />
                  Time ·{' '}
                  <Mono className="font-medium text-foreground">
                    {formatNumber(clock.elapsedDays)} of {formatNumber(clock.totalDays)} days,{' '}
                    {Math.round(clock.elapsedPct)}%
                  </Mono>
                </span>
                <span className="ml-auto text-foreground-tertiary">
                  {formatDate(new Date(clock.startMs))} → {formatDate(new Date(clock.endMs))}
                </span>
              </>
            ) : (
              <span className="ml-auto text-foreground-tertiary">
                Set a start and end date to compare the work against the clock.
              </span>
            )}
          </div>

          {/* The bar is built from phases, so a task with no phase is not in
              it. Saying so is cheaper than silently drawing a shorter bar. */}
          {unphasedTasks > 0 ? (
            <p className="mt-1.5 text-[11px] text-foreground-tertiary">
              {formatNumber(unphasedTasks)} {plural(unphasedTasks, 'task')} not in any phase, so{' '}
              {unphasedTasks === 1 ? 'it is' : 'they are'} not drawn on the bar.
            </p>
          ) : null}

          {/* ── Every phase, in order ── */}
          <ol className="mt-4 grid gap-x-6 gap-y-0.5 sm:grid-cols-2" aria-label="Phases">
            {phases.map((phase, index) => {
              const tone = phaseTone(phase.status);
              const isNow = index === nowIndex;
              return (
                <li key={phase.name} className="min-w-0">
                  <RowLink
                    href={milestoneTasksHref(projectPath, phase.name)}
                    title={`${phase.name} — ${PHASE_STATUS_LABEL[phase.status]}. Open these tasks.`}
                    className="py-1.5"
                  >
                    <IconCircle tone={tone} size={24}>
                      <PhaseIcon status={phase.status} />
                    </IconCircle>
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-[12.5px]',
                        isNow ? 'font-semibold text-foreground' : 'text-foreground',
                      )}
                    >
                      {phase.name}
                    </span>
                    {phase.blockedTasks > 0 ? (
                      <TonePill
                        label={`${phase.blockedTasks} blocked`}
                        tone="danger"
                        className="h-[18px] px-1.5 text-[10px]"
                      />
                    ) : null}
                    <Mono className="w-11 shrink-0 text-right text-[11.5px] text-foreground-secondary">
                      {phase.completedTasks}/{phase.totalTasks}
                    </Mono>
                    <Track
                      pct={phase.percent}
                      tone={phase.status === 'completed' ? 'success' : 'accent'}
                      height={4}
                      className="w-14 shrink-0"
                    />
                  </RowLink>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </DetailCard>
  );
}

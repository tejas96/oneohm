'use client';

import type { DashboardFinancing, ProjectsDashboard, StageGroupKey } from '@tejas96/shared/types';
import Link from 'next/link';
import * as React from 'react';

import { AnimatedNumber } from './animated-number';
import { formatKw, plural } from './format';
import { dashboardLinks } from './links';
import { ENTER, enterDelay } from './motion';

import { cn } from '@/lib/utils';

/**
 * The hero: where every live project is, left to right in lifecycle order.
 * Bars grow from zero once, staggered, so the eye follows the flow of work;
 * after that they only resize. The red base of each bar is its late projects.
 */
export function StagePipeline({
  data,
  financing,
  onOpenStage,
}: {
  data: ProjectsDashboard;
  financing: DashboardFinancing;
  onOpenStage: (key: StageGroupKey) => void;
}): React.JSX.Element {
  const [grown, setGrown] = React.useState(false);
  // The stagger belongs to the first grow only; later resizes move together.
  const [settled, setSettled] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    const settle = window.setTimeout(() => setSettled(true), 1200);
    return () => {
      cancelAnimationFrame(id);
      window.clearTimeout(settle);
    };
  }, []);

  const max = Math.max(1, ...data.stages.map((s) => s.count));
  const totalLive = data.stages.reduce((a, s) => a + s.count, 0);
  const notes = [
    {
      n: data.stageNotes.noStage,
      label: 'No stage yet',
      href: dashboardLinks.stage('none', financing),
    },
    {
      n: data.stageNotes.unstagedSteps,
      label: 'Steps without a stage',
      href: dashboardLinks.attention('unstaged_steps', financing),
    },
    {
      n: data.stageNotes.oldStepsOpen,
      label: 'Old steps left open',
      href: dashboardLinks.attention('old_steps', financing),
    },
  ].filter((note) => note.n > 0);

  return (
    <section className={cn('rounded-xl bg-surface p-5 shadow-e2', ENTER)} style={enterDelay(5)}>
      <header className="flex flex-wrap items-baseline justify-between gap-2 pb-4">
        <h2 className="text-sm font-semibold text-foreground">Where every project is</h2>
        <span className="text-2xs text-foreground-tertiary">
          <span
            aria-hidden="true"
            className="mr-1 inline-block size-2 rounded-sm bg-error align-middle"
          />
          late · select a stage to see its projects
        </span>
      </header>

      {totalLive === 0 && data.stageNotes.noStage === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-secondary">No live projects.</p>
      ) : (
        <ol className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {data.stages.map((s, i) => {
            // A non-empty stage never shrinks to a hairline.
            const height = grown && s.count > 0 ? Math.max(4, (s.count / max) * 100) : 0;
            const latePct = s.count > 0 ? (s.lateCount / s.count) * 100 : 0;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => onOpenStage(s.key)}
                  disabled={s.count === 0}
                  aria-label={`${s.label}: ${plural(s.count, 'project')}, ${s.lateCount} late. Show projects.`}
                  className="group flex w-full flex-col gap-2 rounded-lg p-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-default"
                >
                  <span className="text-center text-sm font-semibold tabular-nums text-foreground">
                    <AnimatedNumber value={s.count} />
                  </span>
                  <span className="flex h-32 flex-col justify-end overflow-hidden rounded-md bg-surface-alt">
                    <span
                      className="flex w-full flex-col justify-end overflow-hidden rounded-md bg-primary-light transition-[height] duration-700 ease-out group-hover:brightness-95 motion-reduce:transition-none"
                      style={{
                        height: `${height}%`,
                        transitionDelay: grown && !settled ? `${i * 60}ms` : '0ms',
                      }}
                    >
                      <span className="w-full bg-error" style={{ height: `${latePct}%` }} />
                    </span>
                  </span>
                  <span className="line-clamp-2 min-h-8 break-words lg:min-h-0 text-balance text-center text-xs text-foreground-secondary">
                    {s.label}
                  </span>
                  <span className="block text-center text-2xs text-foreground-tertiary">
                    {s.lateCount > 0 ? `${s.lateCount} late · ` : ''}
                    {formatKw(s.kw)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {notes.length > 0 ? (
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-xs">
          {notes.map((note) => (
            <Link
              key={note.label}
              href={note.href}
              className="text-foreground-secondary hover:text-primary-dark hover:underline"
            >
              {note.label}: {note.n}
            </Link>
          ))}
        </p>
      ) : null}
    </section>
  );
}

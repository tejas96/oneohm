'use client';

import type { DashboardItem } from '@tejas96/shared/types';
import { ArrowRight, Check, CircleDashed, Clock, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { resolveAction } from '../lib/action-routes';

import { cn } from '@/lib/utils';

interface Milestone {
  name: string;
  done: number;
  total: number;
  overdue: number;
  blocked: number;
  state: 'complete' | 'progress' | 'risk' | 'none';
}

const CHIP: Record<Milestone['state'], { cls: string; Icon: typeof Check }> = {
  complete: { cls: 'bg-success/10 text-success', Icon: Check },
  progress: { cls: 'bg-info/10 text-info', Icon: Clock },
  risk: { cls: 'bg-warning/10 text-warning', Icon: TriangleAlert },
  none: { cls: 'bg-background-tertiary text-foreground-secondary', Icon: CircleDashed },
};

/** Tolerant of a malformed payload: a broken chip row must not blank the card. */
function parseMilestones(raw: string | undefined): Milestone[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Milestone[]) : [];
  } catch {
    return [];
  }
}

export function ProjectRow({ item }: { item: DashboardItem }): React.JSX.Element {
  const target = resolveAction(item);
  const milestones = parseMilestones(item.metaSecondary);

  return (
    <div className="group flex flex-col gap-2 rounded-lg px-3 py-3 transition-colors hover:bg-background-tertiary">
      <div className="flex items-baseline gap-3">
        <span className="flex-1 truncate text-sm font-medium text-foreground">{item.title}</span>
        <span
          className={cn(
            'text-xs',
            item.severity === 'critical'
              ? // `text-danger` does not resolve — this token bridge has no top-level
                // `danger` colour, only `error` (`--ds-danger` under a different name).
                'text-error'
              : item.severity === 'warning'
                ? 'text-warning'
                : 'text-foreground-secondary',
          )}
        >
          {item.reason}
        </span>
        <span className="text-xs tabular-nums text-foreground-secondary">
          {item.meta} tasks done
        </span>
        {target.mode === 'navigate' ? (
          <Link
            href={target.href}
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-pill px-3 text-xs font-medium text-foreground-secondary transition-colors group-hover:bg-accent-subtle group-hover:text-primary-dark"
          >
            Open
            <ArrowRight className="size-3" />
          </Link>
        ) : null}
      </div>

      {milestones.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {milestones.map((milestone) => {
            // `milestone.state` comes through the unsafe `as Milestone[]` cast in
            // parseMilestones, so an out-of-union value from a malformed payload is
            // real at runtime even though the static type says CHIP is total.
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            const { cls, Icon } = CHIP[milestone.state] ?? CHIP.none;
            const trouble =
              milestone.overdue > 0
                ? ` · ${milestone.overdue} overdue`
                : milestone.blocked > 0
                  ? ` · ${milestone.blocked} blocked`
                  : '';
            return (
              <span
                key={milestone.name}
                className={cn('inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-2xs font-medium', cls)}
              >
                <Icon className="size-3" />
                {`${milestone.name} ${milestone.done}/${milestone.total}${trouble}`}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

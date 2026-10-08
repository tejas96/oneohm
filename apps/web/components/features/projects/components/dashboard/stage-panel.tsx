'use client';

import Drawer from '@mui/material/Drawer';
import Skeleton from '@mui/material/Skeleton';
import type { DashboardFinancing, ProjectsDashboard, StageGroupKey } from '@tejas96/shared/types';
import { X } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { BandError } from './band-state';
import { dashboardLinks } from './links';

import { useStageProjects } from '@/lib/hooks/resources';
import { cn } from '@/lib/utils';

/**
 * The projects behind one stage bar. Phase chips narrow both the rows and the
 * "Open in list" link. MUI Drawer with the DrillDownDrawer shell, which has no
 * slot for the chips.
 */
export function StagePanel({
  stageKey,
  data,
  financing,
  onClose,
}: {
  stageKey: StageGroupKey | null;
  data: ProjectsDashboard;
  financing: DashboardFinancing;
  onClose: () => void;
}): React.JSX.Element {
  const [phase, setPhase] = React.useState<string | undefined>(undefined);
  React.useEffect(() => setPhase(undefined), [stageKey]);

  const stage = data.stages.find((s) => s.key === stageKey);
  const query = useStageProjects(stageKey ? { stage: stageKey, phase, financing } : null);
  const total = query.data?.total ?? 0;

  return (
    <Drawer
      anchor="right"
      open={stageKey !== null}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 440 } } }}
    >
      {stage ? (
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between gap-3 border-b border-border p-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">{stage.label}</h2>
              <p className="text-xs text-foreground-secondary">
                {stage.count} projects{stage.lateCount > 0 ? ` · ${stage.lateCount} late` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-foreground-tertiary hover:bg-surface-alt"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </header>

          {stage.phases.length > 1 ? (
            <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3">
              {stage.phases.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  aria-pressed={phase === p.name}
                  onClick={() => setPhase((cur) => (cur === p.name ? undefined : p.name))}
                  className={cn(
                    'rounded-pill px-3 py-1 text-xs',
                    phase === p.name
                      ? 'bg-primary text-white'
                      : 'bg-accent-subtle text-primary-dark hover:brightness-95',
                  )}
                >
                  {p.name} · {p.count}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex-1 overflow-y-auto">
            {query.isError ? (
              <div className="p-5">
                <BandError what="these projects" onRetry={() => void query.refetch()} />
              </div>
            ) : query.isLoading ? (
              <div className="flex flex-col gap-3 p-5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} variant="rounded" height={44} />
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {(query.data?.rows ?? []).map((row) => (
                  <li key={row.projectId}>
                    <Link
                      href={dashboardLinks.project(row.projectId)}
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-alt"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-foreground" title={row.customerName ?? row.projectNumber}>
                          {row.customerName ?? row.projectNumber}
                        </span>
                        <span className="block truncate text-xs text-foreground-tertiary">
                          {row.projectNumber}
                          {row.currentPhase ? ` · ${row.currentPhase}` : ''}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'shrink-0 text-xs tabular-nums',
                          row.daysLate ? 'text-error' : 'text-foreground-tertiary',
                        )}
                      >
                        {row.daysLate ? `${row.daysLate} d late` : 'On time'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-border p-5 text-xs">
            <span className="text-foreground-tertiary">
              {total > 10 ? `Showing 10 of ${total}` : `${total} projects`}
            </span>
            <Link
              href={dashboardLinks.stage(stage.key, financing, phase)}
              className="font-medium text-primary-dark hover:underline"
            >
              Open all {total} in list →
            </Link>
          </footer>
        </div>
      ) : null}
    </Drawer>
  );
}

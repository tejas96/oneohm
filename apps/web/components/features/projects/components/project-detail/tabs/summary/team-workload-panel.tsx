'use client';

import type { TaskStatusConfig } from '@oneohm-epc/shared/types';
import Link from 'next/link';
import React, { useMemo } from 'react';

import { UNASSIGNED_TASK_FILTER } from '../../../../constants';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { TeamWorkloadEntry } from '@/lib/hooks/resources';
import { buildTasksTabUrl, getInitials } from '@/lib/utils';

const FALLBACK_BAR_COLOR = '#94a3b8';

interface WorkloadBarProps {
  tasksByStatus: Record<string, number>;
  totalTasks: number;
  taskStatuses: TaskStatusConfig[] | null | undefined;
}

function WorkloadBar({ tasksByStatus, totalTasks, taskStatuses }: WorkloadBarProps) {
  if (totalTasks === 0) {
    return <div className="h-3 w-full rounded-full bg-border-light/60" />;
  }

  const segments = Object.entries(tasksByStatus)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => {
      const config = taskStatuses?.find((s) => s.code === (status as TaskStatusConfig['code']));
      return {
        status,
        count,
        color: config?.color ?? FALLBACK_BAR_COLOR,
        widthPct: (count / totalTasks) * 100,
      };
    });

  return (
    <div className="h-3 w-full rounded-full overflow-hidden flex bg-border-light">
      {segments.map(({ status, count, color, widthPct }) => (
        <div
          key={status}
          style={{ width: `${widthPct}%`, backgroundColor: color }}
          title={`${status}: ${count}`}
          className="transition-all"
        />
      ))}
    </div>
  );
}

interface TeamWorkloadPanelProps {
  teamWorkload: TeamWorkloadEntry[] | undefined;
  taskStatuses: TaskStatusConfig[] | null | undefined;
  isLoading: boolean;
  projectPath: string;
}

export function TeamWorkloadPanel({
  teamWorkload,
  taskStatuses,
  isLoading,
  projectPath,
}: TeamWorkloadPanelProps) {
  const maxTasks = useMemo(
    () => Math.max(...(teamWorkload?.map((m) => m.totalTasks) ?? [1]), 1),
    [teamWorkload],
  );

  // Build status legend from the first member that has data (to know which statuses exist)
  const statusLegend = useMemo(() => {
    if (!teamWorkload || !taskStatuses) return [];
    const seen = new Set<string>();
    const entries: { code: string; label: string; color: string }[] = [];
    teamWorkload.forEach((member) => {
      Object.keys(member.tasksByStatus).forEach((code) => {
        if (!seen.has(code)) {
          seen.add(code);
          const cfg = taskStatuses.find((s) => s.code === (code as TaskStatusConfig['code']));
          entries.push({
            code,
            label: cfg?.label ?? code,
            color: cfg?.color ?? FALLBACK_BAR_COLOR,
          });
        }
      });
    });
    return entries;
  }, [teamWorkload, taskStatuses]);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-foreground">Team Workload</p>
        {!isLoading && teamWorkload && teamWorkload.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {statusLegend.map((s) => (
              <div key={s.code} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[11px] text-foreground-secondary">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <Skeleton className="h-3 w-full rounded-full" />
              </div>
              <Skeleton className="h-5 w-10 rounded-full" />
            </div>
          ))}
        </div>
      ) : !teamWorkload || teamWorkload.length === 0 ? (
        <div className="flex items-center justify-center min-h-[80px] text-foreground-tertiary text-xs">
          No tasks assigned yet
        </div>
      ) : (
        <ul className="space-y-3">
          {teamWorkload.map((member) => {
            const relativeWidth =
              maxTasks > 0 ? Math.round((member.totalTasks / maxTasks) * 100) : 0;
            // Preserve unassigned intent in deep-link filters.
            const href = buildTasksTabUrl(
              projectPath,
              member.userId ? { assignee: member.userId } : { assignee: UNASSIGNED_TASK_FILTER },
            );

            return (
              <li key={member.userId || 'unassigned'}>
                <Link
                  href={href}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 hover:bg-muted transition-colors group"
                >
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback className="text-[11px] font-semibold">
                      {member.userId === '' ? '?' : getInitials(member.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {member.userName}
                      </span>
                      <span className="text-[11px] text-foreground-secondary shrink-0">
                        {member.totalTasks} task{member.totalTasks !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {/* Outer track scoped to this member's relative share */}
                    <div className="relative h-3 w-full rounded-full bg-border-light/60 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full overflow-hidden"
                        style={{ width: `${relativeWidth}%` }}
                      >
                        <WorkloadBar
                          tasksByStatus={member.tasksByStatus}
                          totalTasks={member.totalTasks}
                          taskStatuses={taskStatuses}
                        />
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-foreground-secondary shrink-0 w-9 text-right">
                    {member.workloadPercent}%
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

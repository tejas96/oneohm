'use client';

import { TaskStatus } from '@oneohm-epc/shared/types';
import { Crown } from 'lucide-react';
import Link from 'next/link';
import type { JSX } from 'react';

import { UNASSIGNED_TASK_FILTER } from '../../../../constants';
import { useProjectTeam, type ProjectTeamMember } from '../../../../hooks';

import { MUIAvatar, Skeleton } from '@/components/ui';
import { type TeamWorkloadEntry, useProjectSummary } from '@/lib/hooks/resources';
import { buildTasksTabUrl } from '@/lib/utils';

interface OverviewTeamPanelProps {
  projectId: string;
  projectPath: string;
  isActive: boolean;
}

function getFullName(firstName?: string, lastName?: string): string {
  return [firstName, lastName].filter(Boolean).join(' ');
}

function countNonCompletedTasks(tasksByStatus: Record<string, number> | undefined): number {
  if (!tasksByStatus) return 0;
  return Object.entries(tasksByStatus).reduce((sum, [rawCode, count]) => {
    const code = rawCode as TaskStatus;
    if (code === TaskStatus.DONE || code === TaskStatus.CANCELLED) return sum;
    return sum + count;
  }, 0);
}

export function OverviewTeamPanel({
  projectId,
  projectPath,
  isActive,
}: OverviewTeamPanelProps): JSX.Element {
  const { data: team, isLoading: teamLoading } = useProjectTeam(projectId, { enabled: isActive });
  const { data: summary } = useProjectSummary(projectId, { enabled: isActive });

  if (teamLoading) {
    return <Skeleton className="h-[320px] rounded-xl" />;
  }

  const workloadRows: TeamWorkloadEntry[] = summary?.teamWorkload ?? [];
  const workloadByUser = new Map<string, TeamWorkloadEntry>(
    workloadRows.map((entry) => [entry.userId, entry]),
  );
  const members: ProjectTeamMember[] = team ?? [];
  const sortedMembers = [...members].sort(
    (a, b) => Number(b.isProjectManager) - Number(a.isProjectManager),
  );

  return (
    <div className="rounded-xl border border-border-light/70 bg-card shadow-card p-5 h-[500px] flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <p className="text-sm font-semibold text-foreground">Team</p>
          <p className="text-[11px] text-foreground-secondary">
            {sortedMembers.length} members · {summary?.metrics.totalTasks ?? 0} tasks
          </p>
        </div>
      </div>

      <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 scrollbar-thin">
        {sortedMembers.length === 0 && (
          <p className="text-xs text-foreground-secondary py-2">No team members assigned yet.</p>
        )}
        {sortedMembers.map((member) => {
          const fullName = getFullName(member.user?.firstName, member.user?.lastName) || 'Unknown';
          const workload = workloadByUser.get(member.userId);
          const totalTasks = workload?.totalTasks ?? 0;
          const dueCount = countNonCompletedTasks(workload?.tasksByStatus);
          const workloadPct = Math.min(100, Math.max(0, workload?.workloadPercent ?? 0));

          return (
            <Link
              key={member.id}
              href={buildTasksTabUrl(projectPath, { assignee: member.userId })}
              className={
                member.isProjectManager
                  ? 'flex items-center justify-between rounded-lg border border-amber-100 bg-gradient-to-r from-amber-50 to-transparent p-2.5 transition-colors'
                  : 'flex items-center justify-between rounded-lg p-2.5 transition-colors hover:bg-muted'
              }
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  <MUIAvatar name={fullName} size="md" />
                  {member.isProjectManager && (
                    <Crown className="absolute -top-1 -right-1 size-3.5 text-amber-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{fullName}</p>
                  <p className="text-[11px] text-foreground-secondary">{member.roleName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-[12px] font-medium text-foreground">
                    {totalTasks} task{totalTasks !== 1 ? 's' : ''}{' '}
                    {dueCount > 0 && `· ${dueCount} pending`}
                  </p>
                  <p className="text-[10px] text-foreground-tertiary mt-0.5">
                    Workload: {workloadPct}%
                  </p>
                </div>
                <div className="w-12 h-1 bg-border-light rounded-full overflow-hidden shrink-0">
                  <div className="h-full bg-primary" style={{ width: `${workloadPct}%` }} />
                </div>
              </div>
            </Link>
          );
        })}

        <Link
          href={buildTasksTabUrl(projectPath, { assignee: UNASSIGNED_TASK_FILTER })}
          className="flex items-center justify-between rounded-lg p-2.5 hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <MUIAvatar name="Unassigned" initials="?" size="md" />
            <div>
              <p className="text-[13px] font-medium text-foreground-secondary">Unassigned</p>
              <p className="text-[11px] text-foreground-tertiary">Needs allocation</p>
            </div>
          </div>
          <p className="text-[12px] font-medium text-error">
            {summary?.metrics.unassignedTasks ?? 0} tasks
          </p>
        </Link>
      </div>
    </div>
  );
}

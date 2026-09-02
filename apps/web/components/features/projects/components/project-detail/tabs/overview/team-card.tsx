'use client';

import { UserRoundX, Users } from 'lucide-react';
import * as React from 'react';

import { UNASSIGNED_TASK_FILTER } from '../../../../constants';
import type { ProjectTeamMember } from '../../../../hooks/types';
import { memberName, plural, sortTeam } from '../../lib/derive';
import {
  DetailCard,
  EmptyPane,
  IconCircle,
  Mono,
  RowLink,
  TonePill,
  Track,
} from '../../primitives';
import type { Panel } from '../../types';

import { MUIAvatar } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProjectSummary, TeamWorkloadEntry } from '@/lib/hooks/resources';
import { useGatedAction } from '@/lib/rbac';
import { buildTasksTabUrl, cn } from '@/lib/utils';

interface TeamCardProps {
  team: Panel<ProjectTeamMember[]>;
  summary: Panel<ProjectSummary>;
  projectPath: string;
  onEditProject?: () => void;
  className?: string;
}

/** Who is on this project and how much of it each person is carrying. */
export function TeamCard({
  team,
  summary,
  projectPath,
  onEditProject,
  className,
}: TeamCardProps): React.JSX.Element {
  const manage = useGatedAction('projects.edit', () => onEditProject?.(), 'Edit project');
  const members = React.useMemo(() => sortTeam(team.data), [team.data]);
  const workloadByUser = React.useMemo(() => {
    const map = new Map<string, TeamWorkloadEntry>();
    for (const entry of summary.data?.teamWorkload ?? []) {
      if (entry.userId) map.set(entry.userId, entry);
    }
    return map;
  }, [summary.data?.teamWorkload]);
  const unassigned = summary.data?.metrics.unassignedTasks;

  const manageButton = onEditProject ? (
    <button
      type="button"
      onClick={manage.onGatedClick}
      aria-disabled={!manage.allowed}
      className={cn(
        'text-[12.5px] font-medium text-primary-dark transition-colors duration-fast hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-rf-xs',
        !manage.allowed && 'opacity-50',
      )}
    >
      Manage team
    </button>
  ) : null;

  return (
    <DetailCard
      label="Team"
      aside={team.data ? `${members.length} ${plural(members.length, 'member')}` : undefined}
      action={manageButton}
      isError={team.isError}
      onRetry={team.refetch}
      className={className}
    >
      {team.isLoading ? (
        <div className="space-y-1">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-11 rounded-2xl" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <EmptyPane
          icon={<Users className="size-4" strokeWidth={2} />}
          title="No team yet"
          description="Add a project manager and the people who will do the work."
        />
      ) : (
        <ol className="flex flex-col gap-0.5">
          {members.map((member) => {
            const name = memberName(member);
            const workload = workloadByUser.get(member.userId);
            const open = workload ? workload.totalTasks - workload.completedTasks : null;
            const donePct =
              workload && workload.totalTasks > 0
                ? (workload.completedTasks / workload.totalTasks) * 100
                : 0;
            return (
              <li key={member.id} className="min-w-0">
                <RowLink
                  href={buildTasksTabUrl(projectPath, { assignee: member.userId })}
                  title={`Open ${name}'s tasks`}
                  className="py-1.5"
                >
                  <MUIAvatar name={name} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-[13px] font-medium text-foreground">
                        {name}
                      </span>
                      {member.isProjectManager ? (
                        <TonePill
                          label="PM"
                          tone="accent"
                          className="h-[18px] px-1.5 text-[10px]"
                        />
                      ) : null}
                    </span>
                    <span className="block truncate text-[11.5px] text-foreground-tertiary">
                      {member.roleName || 'Team member'}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <Mono className="text-[11.5px] text-foreground-secondary">
                      {open == null
                        ? summary.isError
                          ? '—'
                          : ''
                        : `${open} open · ${workload?.completedTasks ?? 0} done`}
                    </Mono>
                    <Track pct={donePct} tone="accent" height={4} className="w-14" />
                  </span>
                </RowLink>
              </li>
            );
          })}
          <li className="min-w-0">
            <RowLink
              href={buildTasksTabUrl(projectPath, { assignee: UNASSIGNED_TASK_FILTER })}
              title="Open unassigned tasks"
              className="py-1.5"
            >
              <IconCircle tone={unassigned && unassigned > 0 ? 'warning' : 'neutral'} size={32}>
                <UserRoundX className="size-4" strokeWidth={1.75} />
              </IconCircle>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-foreground">
                  Unassigned
                </span>
                <span className="block text-[11.5px] text-foreground-tertiary">
                  Nobody owns these yet
                </span>
              </span>
              <Mono
                className={cn(
                  'text-[11.5px]',
                  unassigned && unassigned > 0
                    ? 'font-medium text-warning'
                    : 'text-foreground-secondary',
                )}
              >
                {unassigned == null
                  ? summary.isError
                    ? '—'
                    : ''
                  : `${unassigned} ${plural(unassigned, 'task')}`}
              </Mono>
            </RowLink>
          </li>
        </ol>
      )}
    </DetailCard>
  );
}

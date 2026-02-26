'use client';

import { TaskStatus } from '@oneohm-epc/shared-types';
import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  MAX_TASKS_PER_COLUMN,
  TASK_PRIORITY_DOT_COLOR,
  TASK_STATUS_LABELS,
} from '../../../constants';
import type { TeamMemberSummary } from '../../../hooks';
import type { ProjectTaskItem } from '../../../hooks/types';
import { useProjectTasks, useProjectTeam } from '../../../hooks/use-project-detail';
import { TeamAvatarGroup } from '../../team-avatar-group';

import { ErrorState } from '@/components/shared/feedback/empty-state';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { getErrorMessage } from '@/lib/utils/error';
import { formatDate, getDueDateColor, getInitials } from '@/lib/utils/format';
import { useAuth } from '@/providers/auth-provider';


interface ProjectTasksTabProps {
  projectId: string;
  isActive: boolean;
}

const KANBAN_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: TaskStatus.TODO, label: TASK_STATUS_LABELS[TaskStatus.TODO] },
  { status: TaskStatus.IN_PROGRESS, label: TASK_STATUS_LABELS[TaskStatus.IN_PROGRESS] },
  { status: TaskStatus.BLOCKED, label: TASK_STATUS_LABELS[TaskStatus.BLOCKED] },
  { status: TaskStatus.DONE, label: TASK_STATUS_LABELS[TaskStatus.DONE] },
];

const STATUS_TO_COLUMN: Record<string, TaskStatus> = {
  [TaskStatus.BACKLOG]: TaskStatus.TODO,
  [TaskStatus.TODO]: TaskStatus.TODO,
  [TaskStatus.IN_PROGRESS]: TaskStatus.IN_PROGRESS,
  [TaskStatus.IN_REVIEW]: TaskStatus.IN_PROGRESS,
  [TaskStatus.TESTING]: TaskStatus.IN_PROGRESS,
  [TaskStatus.BLOCKED]: TaskStatus.BLOCKED,
  [TaskStatus.DONE]: TaskStatus.DONE,
};

const PRIORITY_BORDER: Record<string, string> = {
  critical: 'border-l-error',
  high: 'border-l-warning',
  medium: 'border-l-info',
  low: 'border-l-foreground-tertiary',
};

const COLUMN_BG: Record<string, string> = {
  [TaskStatus.TODO]: 'bg-background-secondary',
  [TaskStatus.IN_PROGRESS]: 'bg-info/5',
  [TaskStatus.BLOCKED]: 'bg-warning/5',
  [TaskStatus.DONE]: 'bg-success/5',
};

const COLUMN_LABEL_COLOR: Record<string, string> = {
  [TaskStatus.TODO]: 'text-foreground-secondary',
  [TaskStatus.IN_PROGRESS]: 'text-info',
  [TaskStatus.BLOCKED]: 'text-warning',
  [TaskStatus.DONE]: 'text-success',
};

function TaskCard({ task, isDone }: { task: ProjectTaskItem; isDone?: boolean }) {
  const borderAccent = PRIORITY_BORDER[task.priority] ?? '';
  const initials = task.assigneeName ? getInitials(task.assigneeName) : null;
  const isBlocked = task.status === TaskStatus.BLOCKED;
  const priorityDot = TASK_PRIORITY_DOT_COLOR?.[task.priority] ?? 'bg-foreground-tertiary';
  const fullLabel = `${task.code}: ${task.name}`;

  return (
    <TooltipProvider delayDuration={300}>
      <div className={`rounded-md border border-border-light bg-background p-2.5 border-l-[3px] ${borderAccent} ${isDone ? 'opacity-70' : ''}`}>
        {/* Row 1: task code + priority dot */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-2xs text-foreground-secondary font-mono">{task.code}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`size-2 rounded-full shrink-0 ${priorityDot}`} />
            </TooltipTrigger>
            <TooltipContent side="top" variant="dark">
              {task.priority} priority
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Row 2: task name with tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <p className={`text-xs font-medium truncate ${isDone ? 'line-through text-foreground-secondary' : 'text-foreground'}`}>
              {task.name}
            </p>
          </TooltipTrigger>
          <TooltipContent side="top" variant="dark" className="max-w-[220px]">
            {fullLabel}
          </TooltipContent>
        </Tooltip>

        {/* Row 3: blocked reason OR assignee + date */}
        {isBlocked && task.blockedReason && (
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-2xs text-error mt-1.5 truncate">{task.blockedReason}</p>
            </TooltipTrigger>
            <TooltipContent side="top" variant="dark" className="max-w-[220px]">
              {task.blockedReason}
            </TooltipContent>
          </Tooltip>
        )}
        {!isBlocked && (
          <div className="flex items-center justify-between mt-1.5">
            {initials ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Avatar size="xs" className="size-5">
                      <AvatarFallback size="xs" name={task.assigneeName} className="text-[8px]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" variant="dark">
                  {task.assigneeName}
                </TooltipContent>
              </Tooltip>
            ) : (
              <span className="text-2xs text-foreground-tertiary">Unassigned</span>
            )}
            {task.endDate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={`text-2xs ${getDueDateColor(task.endDate)}`}>
                    {formatDate(task.endDate, 'short')}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" variant="dark">
                  Due {formatDate(task.endDate, 'medium')}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function KanbanColumn({ status, label, tasks, count }: {
  status: TaskStatus;
  label: string;
  tasks: ProjectTaskItem[];
  count: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = useCallback(() => setExpanded((prev) => !prev), []);

  const hasOverflow = tasks.length > MAX_TASKS_PER_COLUMN;
  const displayed = expanded ? tasks : tasks.slice(0, MAX_TASKS_PER_COLUMN);
  const isDone = status === TaskStatus.DONE;

  return (
    <div className={`rounded-lg p-3 ${COLUMN_BG[status] ?? 'bg-background-secondary'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-2xs font-semibold uppercase ${COLUMN_LABEL_COLOR[status] ?? 'text-foreground-secondary'}`}>{label}</span>
        <span className={`text-2xs font-semibold ${COLUMN_LABEL_COLOR[status] ?? 'text-foreground-tertiary'}`}>{count}</span>
      </div>
      {tasks.length === 0 ? (
        <p className="text-2xs text-foreground-tertiary py-4 text-center">No tasks</p>
      ) : (
        <div className="space-y-2">
          {displayed.map((task) => (
            <TaskCard key={task.id} task={task} isDone={isDone} />
          ))}
          {hasOverflow && (
            <button
              type="button"
              onClick={toggleExpanded}
              className="block w-full text-2xs text-primary font-medium text-center pt-1 hover:underline cursor-pointer"
            >
              {expanded ? 'Show less' : `+${tasks.length - MAX_TASKS_PER_COLUMN} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export const ProjectTasksTab = React.memo(({
  projectId,
  isActive,
}: ProjectTasksTabProps): React.JSX.Element => {
  const { user } = useAuth();
  const { data: tasks, isLoading, isError, error, refetch } = useProjectTasks(projectId, { enabled: isActive });
  const { data: team } = useProjectTeam(projectId, { enabled: isActive });

  const avatarMembers: TeamMemberSummary[] = useMemo(() => {
    if (!team) return [];
    const mapped = team.map((m) => ({
      id: m.userId,
      firstName: m.user?.firstName ?? 'Unknown',
      lastName: m.user?.lastName,
      isProjectManager: m.isProjectManager,
    }));
    const currentUserId = user?.id;
    return mapped.sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return 0;
    });
  }, [team, user?.id]);

  const isCurrentUserInTeam = useMemo(
    () => !!user?.id && avatarMembers.some((m) => m.id === user.id),
    [avatarMembers, user?.id],
  );

  const [selectedAssignees, setSelectedAssignees] = useState<Set<string>>(() => new Set());

  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current || !team) return;
    if (isCurrentUserInTeam && user?.id) {
      setSelectedAssignees(new Set([user.id]));
    }
    initializedRef.current = true;
  }, [team, isCurrentUserInTeam, user?.id]);

  const handleToggleAssignee = useCallback((memberId: string) => {
    setSelectedAssignees((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  }, []);

  const handleClearFilter = useCallback(() => {
    setSelectedAssignees(new Set());
  }, []);

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    if (selectedAssignees.size === 0) return tasks;
    return tasks.filter((t) => t.assignedToUserId && selectedAssignees.has(t.assignedToUserId));
  }, [tasks, selectedAssignees]);

  const grouped = useMemo(() => {
    const groups: Record<string, ProjectTaskItem[]> = {};
    for (const task of filteredTasks) {
      const column = STATUS_TO_COLUMN[task.status];
      if (!column) continue;
      if (!groups[column]) groups[column] = [];
      groups[column].push(task);
    }
    return groups;
  }, [filteredTasks]);

  if (isLoading && isActive) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load tasks"
        description={getErrorMessage(error)}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-semibold text-foreground">Project Tasks</h3>
          {avatarMembers.length > 0 && (
            <TeamAvatarGroup
              members={avatarMembers}
              max={4}
              size="xs"
              selectable
              selectedIds={selectedAssignees}
              onToggle={handleToggleAssignee}
              onClear={handleClearFilter}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={buildRoute(ROUTES.PROJECTS.BOARD, undefined, { project: projectId })}>
              Open Full Kanban
            </Link>
          </Button>
          <Button size="sm" onClick={() => showToast.info('Coming Soon')}>
            + Add Task
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {KANBAN_COLUMNS.map((col) => {
          const columnTasks = grouped[col.status] ?? [];
          return (
            <KanbanColumn
              key={col.status}
              status={col.status}
              label={col.label}
              tasks={columnTasks}
              count={columnTasks.length}
            />
          );
        })}
      </div>
    </div>
  );
});

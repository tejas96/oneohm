'use client';

import { TaskStatus } from '@oneohm-epc/shared/types';
import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MAX_TASKS_PER_COLUMN, TASK_PRIORITY_DOT_COLOR } from '../../../constants';
import type { TeamMemberSummary } from '../../../hooks';
import type { ProjectTaskItem } from '../../../hooks/types';
import { useProjectTasks, useProjectTeam } from '../../../hooks/use-project-detail';
import { useProjectTaskStatuses } from '../../../hooks/use-project-task-statuses';
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

const PRIORITY_BORDER: Record<string, string> = {
  urgent: 'border-l-error',
  high: 'border-l-warning',
  normal: 'border-l-info',
  medium: 'border-l-info',
  low: 'border-l-foreground-tertiary',
};

function TaskCard({ task, isDone }: { task: ProjectTaskItem; isDone?: boolean }) {
  const borderAccent = PRIORITY_BORDER[task.priority] ?? '';
  const initials = task.assigneeName ? getInitials(task.assigneeName) : null;
  const isBlocked = task.status === TaskStatus.BLOCKED;
  const priorityDot = TASK_PRIORITY_DOT_COLOR?.[task.priority] ?? 'bg-foreground-tertiary';
  const fullLabel = `${task.code}: ${task.name}`;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={`rounded-md border border-border-light bg-background p-2.5 border-l-[3px] ${borderAccent} ${isDone ? 'opacity-70' : ''}`}
      >
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
            <p
              className={`text-xs font-medium truncate ${isDone ? 'line-through text-foreground-secondary' : 'text-foreground'}`}
            >
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

function KanbanColumn({
  status,
  label,
  color,
  tasks,
  count,
}: {
  status: string;
  label: string;
  color: string;
  tasks: ProjectTaskItem[];
  count: number;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = useCallback(() => setExpanded((prev) => !prev), []);

  const hasOverflow = tasks.length > MAX_TASKS_PER_COLUMN;
  const displayed = expanded ? tasks : tasks.slice(0, MAX_TASKS_PER_COLUMN);
  const isDone = status === (TaskStatus.DONE as string);

  // Derive a light tint background from the hex color
  const bgStyle = { backgroundColor: `${color}0F` }; // ~6% opacity

  return (
    <div className="rounded-lg p-3" style={bgStyle}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xs font-semibold uppercase" style={{ color }}>
          {label}
        </span>
        <span className="text-2xs font-semibold" style={{ color }}>
          {count}
        </span>
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

export const ProjectTasksTab = React.memo(
  ({ projectId, isActive }: ProjectTasksTabProps): React.JSX.Element => {
    const { user } = useAuth();
    const {
      taskStatuses,
      isLoading: statusesLoading,
      isError: statusesError,
      error: statusesErrorMsg,
    } = useProjectTaskStatuses(projectId);
    const {
      data: tasks,
      isLoading,
      isError,
      error,
      refetch,
    } = useProjectTasks(projectId, { enabled: isActive });
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
      if (taskStatuses.length === 0) return {};
      const configuredCodes = new Set(taskStatuses.map((s) => s.code));
      // Safe: length guard above ensures [0] exists
      const firstCode = taskStatuses[0]!.code;
      const groups: Record<string, ProjectTaskItem[]> = {};
      for (const task of filteredTasks) {
        const columnCode = configuredCodes.has(task.status) ? task.status : firstCode;
        if (!groups[columnCode]) groups[columnCode] = [];
        groups[columnCode].push(task);
      }
      return groups;
    }, [filteredTasks, taskStatuses]);

    if ((isLoading || statusesLoading) && isActive) {
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

    if (statusesError) {
      return (
        <ErrorState
          title="Failed to load project statuses"
          description={getErrorMessage(statusesErrorMsg)}
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
          {taskStatuses.map((col) => {
            const columnTasks = grouped[col.code] ?? [];
            return (
              <KanbanColumn
                key={col.code}
                status={col.code}
                label={col.label}
                color={col.color}
                tasks={columnTasks}
                count={columnTasks.length}
              />
            );
          })}
        </div>
      </div>
    );
  },
);

'use client';

import type { MyTask } from '@oneohm-epc/shared/types';
import { Calendar, Check, Crown, FolderKanban, Pencil, User, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

import { useProjectTeam } from '../../projects/hooks';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { cn, formatRelativeDate, getDueDateColor } from '@/lib/utils';

interface TaskDrawerDetailsProps {
  task: MyTask;
  onDueDateChange?: (date: string | undefined) => void;
  onAssigneeChange?: (userId: string | null) => void;
  onDescriptionChange?: (description: string) => void;
}

export function TaskDrawerDetails({
  task,
  onDueDateChange,
  onAssigneeChange,
  onDescriptionChange,
}: TaskDrawerDetailsProps): React.JSX.Element {
  const projectHref = buildRoute(ROUTES.PROJECTS.DETAIL, { id: task.projectId });
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [draftDescription, setDraftDescription] = useState(task.description ?? '');

  const { data: teamMembers } = useProjectTeam(task.projectId, {
    enabled: !!task.projectId,
  });

  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);

  const currentAssignee = useMemo(() => {
    if (!task.assignedToUserId || !teamMembers) return null;
    return teamMembers.find((m) => m.userId === task.assignedToUserId) ?? null;
  }, [task.assignedToUserId, teamMembers]);

  const currentAssigneeName = useMemo(() => {
    if (currentAssignee?.user) {
      return (
        `${currentAssignee.user.firstName ?? ''} ${currentAssignee.user.lastName ?? ''}`.trim() ||
        currentAssignee.user.email ||
        'Unknown'
      );
    }
    return task.assigneeName ?? null;
  }, [currentAssignee, task.assigneeName]);

  const handleReassign = useCallback(
    (userId: string) => {
      if (!onAssigneeChange) return;
      onAssigneeChange(userId);
      setAssigneePopoverOpen(false);
    },
    [onAssigneeChange],
  );

  const handleDateChange = useCallback(
    (date: Date | undefined) => {
      if (!onDueDateChange) return;
      onDueDateChange(
        date
          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          : undefined,
      );
    },
    [onDueDateChange],
  );

  const handleSaveDescription = useCallback(() => {
    if (!onDescriptionChange) return;
    onDescriptionChange(draftDescription);
    setIsEditingDescription(false);
  }, [draftDescription, onDescriptionChange]);

  const handleCancelDescription = useCallback(() => {
    setDraftDescription(task.description ?? '');
    setIsEditingDescription(false);
  }, [task.description]);

  return (
    <div className="space-y-4">
      {/* Assignee — avatar with reassign popover */}
      <div className="flex items-start gap-3">
        <User className="size-4 text-foreground-tertiary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-2xs text-foreground-tertiary mb-1">Assignee</p>
          {onAssigneeChange && teamMembers ? (
            <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen} modal>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md px-1.5 py-1 -ml-1.5 hover:bg-muted transition-colors cursor-pointer"
                >
                  {currentAssigneeName ? (
                    <>
                      <Avatar size="xs">
                        <AvatarFallback size="xs" name={currentAssigneeName}>
                          {getInitials(currentAssigneeName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-foreground-secondary">
                        {currentAssigneeName}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="size-7 rounded-full border-2 border-dashed border-border-light flex items-center justify-center">
                        <User className="size-3 text-foreground-muted" />
                      </div>
                      <span className="text-sm text-foreground-muted">Unassigned</span>
                    </>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" side="bottom" className="w-52 p-1">
                <p className="px-2 py-1.5 text-xs font-semibold text-foreground-secondary">
                  Assign to
                </p>
                {teamMembers.map((member) => {
                  const name = member.user
                    ? `${member.user.firstName ?? ''} ${member.user.lastName ?? ''}`.trim() ||
                      member.user.email ||
                      'Unknown'
                    : 'Unknown';
                  const isCurrentAssignee = member.userId === task.assignedToUserId;
                  return (
                    <button
                      key={member.userId}
                      type="button"
                      onClick={() => handleReassign(member.userId)}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-sm w-full text-left hover:bg-accent cursor-pointer transition-colors',
                        isCurrentAssignee && 'bg-primary/5',
                      )}
                    >
                      <Avatar size="xs" className="size-6 shrink-0">
                        <AvatarFallback size="xs" name={name} className="text-section">
                          {getInitials(name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-foreground truncate flex-1">{name}</span>
                      {isCurrentAssignee && <Check className="size-3.5 text-primary shrink-0" />}
                      {member.isProjectManager && !isCurrentAssignee && (
                        <Crown className="size-3.5 text-warning shrink-0" />
                      )}
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>
          ) : (
            <p className="text-sm text-foreground-secondary">{task.assigneeName ?? 'Unassigned'}</p>
          )}
        </div>
      </div>

      {/* Project — read-only link */}
      <div className="flex items-start gap-3">
        <FolderKanban className="size-4 text-foreground-tertiary mt-0.5 shrink-0" />
        <div>
          <p className="text-2xs text-foreground-tertiary mb-0.5">Project</p>
          <Link href={projectHref} className="text-sm text-primary hover:underline">
            {task.projectNumber} - {task.projectName}
          </Link>
        </div>
      </div>

      {/* Due Date — editable date picker */}
      <div className="flex items-start gap-3">
        <Calendar className="size-4 text-foreground-tertiary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-2xs text-foreground-tertiary mb-0.5">Due Date</p>
          {onDueDateChange ? (
            <DatePicker
              value={task.endDate ? new Date(task.endDate) : undefined}
              onChange={handleDateChange}
              placeholder="Set due date"
              minDate={new Date(new Date().setHours(0, 0, 0, 0))}
              className={cn(
                'h-auto py-0 text-sm border-none shadow-none px-0 w-auto',
                task.endDate ? getDueDateColor(task.endDate) : 'text-foreground-muted',
              )}
              showQuickSelect
              showIcon={false}
            />
          ) : task.endDate ? (
            <p className={`text-sm font-medium ${getDueDateColor(task.endDate)}`}>
              {formatRelativeDate(task.endDate)}
            </p>
          ) : (
            <p className="text-sm text-foreground-muted">No due date</p>
          )}
        </div>
      </div>

      {/* Progress */}
      {task.completionPercentage > 0 && (
        <div>
          <p className="text-2xs text-foreground-tertiary mb-1.5">Progress</p>
          <div className="flex items-center gap-3">
            <Progress value={task.completionPercentage} size="sm" className="flex-1" />
            <span className="text-xs text-foreground-muted">{task.completionPercentage}%</span>
          </div>
        </div>
      )}

      {/* Description — inline editable */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-2xs text-foreground-tertiary">Description</p>
          {onDescriptionChange && !isEditingDescription && (
            <button
              type="button"
              onClick={() => {
                setDraftDescription(task.description ?? '');
                setIsEditingDescription(true);
              }}
              className="text-foreground-muted hover:text-foreground-secondary transition-colors"
            >
              <Pencil className="size-3" />
            </button>
          )}
        </div>
        {isEditingDescription ? (
          <div className="space-y-2">
            <textarea
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border-light bg-background px-3 py-2 text-sm placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="Add a description..."
              autoFocus
            />
            <div className="flex items-center gap-1.5">
              <Button size="sm" onClick={handleSaveDescription} className="h-6 px-2 text-xs">
                <Check className="size-3 mr-1" />
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelDescription}
                className="h-6 px-2 text-xs"
              >
                <X className="size-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : task.description ? (
          <p className="text-sm text-foreground-secondary whitespace-pre-line">
            {task.description}
          </p>
        ) : (
          <p className="text-sm text-foreground-muted italic">No description</p>
        )}
      </div>

      {/* Blocked Reason */}
      {task.blockedReason && (
        <div className="rounded-lg bg-error/5 border border-error/20 p-3">
          <p className="text-2xs font-medium text-error mb-0.5">Blocked Reason</p>
          <p className="text-sm text-foreground-secondary">{task.blockedReason}</p>
        </div>
      )}

      {/* Dependency blocker warning */}
      {task.hasDependencyBlockers && (
        <div className="rounded-lg bg-warning/5 border border-warning/20 p-3">
          <p className="text-2xs font-medium text-warning mb-0.5">Blocked by Dependencies</p>
          <p className="text-sm text-warning">Some dependency tasks are not yet complete</p>
        </div>
      )}
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';
  return `${first}${last}`.toUpperCase() || '?';
}

'use client';

import { TASK_STATUS_OPTIONS, type TaskStatusOption } from '@tejas96/shared/constants';
import { TaskStatus } from '@tejas96/shared/types';
import { Lock, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TaskStatusDropdownProps {
  currentStatus: TaskStatus;
  taskStatuses?: TaskStatusOption[];
  /** When true the dropdown is locked — unresolved dependencies block status changes. */
  hasDependencyBlockers?: boolean;
  onStatusChange: (status: TaskStatus) => void;
}

export function TaskStatusDropdown({
  currentStatus,
  taskStatuses = TASK_STATUS_OPTIONS,
  hasDependencyBlockers = false,
  onStatusChange,
}: TaskStatusDropdownProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const isDisabled = hasDependencyBlockers;

  const handleSelect = (code: string): void => {
    setOpen(false);
    onStatusChange(code as TaskStatus);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <Popover open={hasDependencyBlockers ? false : open} onOpenChange={setOpen}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={isDisabled}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'flex items-center gap-1 rounded px-2 py-1 text-2xs transition-colors',
                  hasDependencyBlockers
                    ? 'text-amber-600 bg-amber-50 cursor-not-allowed opacity-70'
                    : 'text-info bg-info/10 hover:bg-info/20 disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                {hasDependencyBlockers ? (
                  <Lock className="size-3" />
                ) : (
                  <RefreshCw className="size-3" />
                )}
                Status
              </button>
            </PopoverTrigger>
          </TooltipTrigger>

          <PopoverContent
            align="end"
            className="w-36 p-1"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {taskStatuses
              .filter((s) => s.value !== currentStatus)
              .map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => handleSelect(s.value)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-3 py-1.5 text-xs transition-colors',
                    'text-foreground-secondary hover:bg-muted',
                  )}
                >
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.label}
                </button>
              ))}
          </PopoverContent>
        </Popover>

        {hasDependencyBlockers && (
          <TooltipContent side="top" className="max-w-[200px] text-center">
            Complete all dependencies before changing this task&apos;s status.
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

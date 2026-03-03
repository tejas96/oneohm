'use client';

import { TASK_STATUS_TRANSITIONS, TaskStatus } from '@oneohm-epc/shared-types';
import { Check, RefreshCw, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

import { TASK_STATUS_DOT_COLOR, TASK_STATUS_LABELS } from '../constants';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const TERMINAL_STATUSES = new Set([TaskStatus.DONE, TaskStatus.CANCELLED]);

interface TaskStatusDropdownProps {
  currentStatus: TaskStatus;
  onStatusChange: (status: TaskStatus) => void;
}

export function TaskStatusDropdown({
  currentStatus,
  onStatusChange,
}: TaskStatusDropdownProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

  const allowedTransitions = useMemo(
    () => TASK_STATUS_TRANSITIONS[currentStatus] ?? [],
    [currentStatus],
  );

  const incompleteOptions = useMemo(
    () => allowedTransitions.filter((s) => !TERMINAL_STATUSES.has(s)),
    [allowedTransitions],
  );

  const canMarkDone = allowedTransitions.includes(TaskStatus.DONE);
  const canCancel = allowedTransitions.includes(TaskStatus.CANCELLED);

  const handleSelect = (status: TaskStatus) => {
    setOpen(false);
    onStatusChange(status);
  };

  if (allowedTransitions.length === 0) return <></>;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 rounded px-2 py-1 text-2xs text-info bg-info/10 hover:bg-info/20 transition-colors"
        >
          <RefreshCw className="size-3" />
          Status
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-36 p-1" onClick={(e) => e.stopPropagation()}>
        {incompleteOptions.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => handleSelect(status)}
            className={cn(
              'flex w-full items-center gap-2 rounded px-3 py-1.5 text-xs transition-colors',
              status === currentStatus
                ? 'bg-info/10 text-info font-medium'
                : 'text-foreground-secondary hover:bg-muted',
            )}
          >
            <span className={cn('size-2 rounded-full', TASK_STATUS_DOT_COLOR[status])} />
            {TASK_STATUS_LABELS[status]}
            {status === currentStatus && <Check className="ml-auto size-3" />}
          </button>
        ))}

        {(canMarkDone || canCancel) && incompleteOptions.length > 0 && (
          <div className="my-1 h-px bg-border-light" />
        )}

        {canMarkDone && (
          <button
            type="button"
            onClick={() => handleSelect(TaskStatus.DONE)}
            className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-xs text-success hover:bg-success/5 transition-colors"
          >
            <Check className="size-3" />
            Done
          </button>
        )}

        {canCancel && (
          <button
            type="button"
            onClick={() => handleSelect(TaskStatus.CANCELLED)}
            className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-xs text-error hover:bg-error/5 transition-colors"
          >
            <XCircle className="size-3" />
            Cancel
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

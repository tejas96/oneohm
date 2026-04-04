'use client';

import { TaskStatus } from '@oneohm-epc/shared/types';
import { Check, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { TASK_STATUS_DOT_COLOR, TASK_STATUS_LABELS } from '../constants';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TaskStatusDropdownProps {
  currentStatus: TaskStatus;
  onStatusChange: (status: TaskStatus) => void;
}

export function TaskStatusDropdown({
  currentStatus,
  onStatusChange,
}: TaskStatusDropdownProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

  const allStatuses = useMemo(() => Object.keys(TASK_STATUS_LABELS) as TaskStatus[], []);

  const handleSelect = (status: TaskStatus) => {
    setOpen(false);
    onStatusChange(status);
  };

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
        {allStatuses
          .filter((status) => status !== currentStatus)
          .map((status) => (
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
      </PopoverContent>
    </Popover>
  );
}

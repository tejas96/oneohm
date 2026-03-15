'use client';

import {
  TASK_STATUS_TRANSITIONS,
  type TaskPriority,
  type TaskStatus,
} from '@oneohm-epc/shared/types';
import { useMemo } from 'react';

import {
  TASK_PRIORITY_BADGE_VARIANT,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_BADGE_VARIANT,
  TASK_STATUS_LABELS,
} from '../../projects/constants';

import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TaskDrawerHeaderProps {
  projectNumber: string;
  code: string;
  name: string;
  status: TaskStatus;
  priority: TaskPriority;
  onStatusChange: (status: TaskStatus) => void;
  onPriorityChange: (priority: TaskPriority) => void;
}

export function TaskDrawerHeader({
  projectNumber,
  code,
  name,
  status,
  priority,
  onStatusChange,
  onPriorityChange,
}: TaskDrawerHeaderProps): React.JSX.Element {
  const allowedStatuses = useMemo(() => TASK_STATUS_TRANSITIONS[status] ?? [], [status]);

  return (
    <div className="space-y-1 pb-4 border-b border-border-light">
      <p className="text-2xs font-mono text-foreground-tertiary">
        {projectNumber} / {code}
      </p>
      <h2 className="text-lg font-semibold leading-tight">{name || code || 'Untitled'}</h2>
      <div className="flex items-center gap-2 pt-2">
        <Select value={status} onValueChange={(v) => onStatusChange(v as TaskStatus)}>
          <SelectTrigger className="h-6 w-auto min-w-0 gap-1 border-none px-0 shadow-none">
            <Badge
              variant={
                TASK_STATUS_BADGE_VARIANT[status] as
                  | 'info'
                  | 'warning'
                  | 'error'
                  | 'secondary'
                  | 'success'
              }
              size="xs"
              shape="rounded"
            >
              <SelectValue>{TASK_STATUS_LABELS[status]}</SelectValue>
            </Badge>
          </SelectTrigger>
          <SelectContent>
            <SelectItem key={status} value={status} disabled>
              {TASK_STATUS_LABELS[status]} (current)
            </SelectItem>
            {allowedStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {TASK_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priority} onValueChange={(v) => onPriorityChange(v as TaskPriority)}>
          <SelectTrigger className="h-6 w-auto min-w-0 gap-1 border-none px-0 shadow-none">
            <Badge
              variant={
                TASK_PRIORITY_BADGE_VARIANT[priority] as 'info' | 'warning' | 'error' | 'secondary'
              }
              size="xs"
              shape="rounded"
            >
              <SelectValue>{TASK_PRIORITY_LABELS[priority]}</SelectValue>
            </Badge>
          </SelectTrigger>
          <SelectContent>
            {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
              <SelectItem key={p} value={p}>
                {TASK_PRIORITY_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

import { TaskStatus } from '@oneohm-epc/shared/types';

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  status_changed: 'changed status',
  assigned: 'reassigned',
  updated: 'updated',
  created: 'created',
  priority_changed: 'changed priority',
  progress_updated: 'updated progress',
  commented: 'commented',
};

export const STARTABLE_STATUSES = new Set<TaskStatus>([TaskStatus.TODO, TaskStatus.BACKLOG]);

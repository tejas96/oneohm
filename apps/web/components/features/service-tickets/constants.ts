import { ServiceTicketPriority, ServiceTicketStatus } from '@tejas96/shared/types';

import type { ServiceTicket } from './hooks/use-service-tickets';

import type { CrmTone } from '@/components/shared/crm-table';
import { parseLocalDate } from '@/lib/utils';

export const SERVICE_TICKET_STATUS_LABELS: Record<ServiceTicketStatus, string> = {
  [ServiceTicketStatus.OPEN]: 'Open',
  [ServiceTicketStatus.IN_PROGRESS]: 'In Progress',
  [ServiceTicketStatus.RESOLVED]: 'Resolved',
  [ServiceTicketStatus.CLOSED]: 'Closed',
};

export const SERVICE_TICKET_PRIORITY_LABELS: Record<ServiceTicketPriority, string> = {
  [ServiceTicketPriority.LOW]: 'Low',
  [ServiceTicketPriority.MEDIUM]: 'Medium',
  [ServiceTicketPriority.HIGH]: 'High',
  [ServiceTicketPriority.URGENT]: 'Urgent',
};

export const SERVICE_TICKET_STATUS_TONE: Record<ServiceTicketStatus, CrmTone> = {
  [ServiceTicketStatus.OPEN]: 'warning',
  [ServiceTicketStatus.IN_PROGRESS]: 'info',
  [ServiceTicketStatus.RESOLVED]: 'success',
  [ServiceTicketStatus.CLOSED]: 'neutral',
};

export const SERVICE_TICKET_PRIORITY_TONE: Record<ServiceTicketPriority, CrmTone> = {
  [ServiceTicketPriority.LOW]: 'neutral',
  [ServiceTicketPriority.MEDIUM]: 'info',
  [ServiceTicketPriority.HIGH]: 'warning',
  [ServiceTicketPriority.URGENT]: 'danger',
};

/** Table column -> API sort field. Anything absent falls back to createdAt. */
export const SERVICE_TICKET_SORT_FIELD_MAP: Record<string, string> = {
  ticketNumber: 'ticketNumber',
  title: 'title',
  status: 'status',
  priority: 'priority',
  createdAt: 'createdAt',
  dueDate: 'dueDate',
};

/** URL filter keys, shared by the stat tiles and the quick-filter chips. */
export const TICKET_FILTER_KEYS = {
  status: 'status',
  priority: 'priority',
  assigneeId: 'assigneeId',
  overdue: 'overdue',
  createdBy: 'createdBy',
} as const;

const LIVE_STATUSES: readonly ServiceTicketStatus[] = [
  ServiceTicketStatus.OPEN,
  ServiceTicketStatus.IN_PROGRESS,
];

/** Active ticket with a due date before today. */
export function isTicketOverdue(ticket: Pick<ServiceTicket, 'dueDate' | 'status'>): boolean {
  if (!ticket.dueDate || !LIVE_STATUSES.includes(ticket.status)) return false;
  const due = parseLocalDate(ticket.dueDate);
  if (!due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

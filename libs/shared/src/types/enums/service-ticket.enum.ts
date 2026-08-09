/**
 * ============================================
 * SERVICE TICKET ENUMS
 * ============================================
 *
 * Post-handover complaints, AMC queries and general issues raised against a
 * completed project.
 */

export enum ServiceTicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum ServiceTicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * The single definition of "active" — a ticket that still needs someone's
 * attention. The backend count queries, the `hasActiveTickets` filters and the
 * chip on the customers and projects lists all derive from this one array, so
 * they cannot drift apart.
 */
export const ACTIVE_TICKET_STATUSES: readonly ServiceTicketStatus[] = [
  ServiceTicketStatus.OPEN,
  ServiceTicketStatus.IN_PROGRESS,
] as const;

export function isActiveTicketStatus(status: ServiceTicketStatus): boolean {
  return ACTIVE_TICKET_STATUSES.includes(status);
}

/** Shape of one entry in `service_tickets.photos`. */
export interface ServiceTicketPhoto {
  fileName: string;
  fileKey: string;
  publicUrl: string;
  fileSize?: number;
  mimeType?: string;
}

export const MAX_SERVICE_TICKET_PHOTOS = 5;

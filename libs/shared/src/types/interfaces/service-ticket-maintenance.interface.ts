import type { CustomerWhatsappState, CustomerWhatsappStatus } from './task.interface';

export type MaintenanceItemResult = 'ok' | 'issue';

export interface MaintenanceChecklistAnswer {
  result: MaintenanceItemResult;
  /** Only meaningful when result is `issue`. */
  note?: string | null;
}

/**
 * Stored on `service_tickets.checklist`. An item key missing from `items` is
 * not answered yet. Keys come from `MAINTENANCE_CHECKLIST` and never change
 * once shipped.
 */
export interface MaintenanceChecklist {
  items: Record<string, MaintenanceChecklistAnswer>;
  readings: { generationKwh: number | null; netMeterReading: number | null };
}

export type MaintenanceWhatsappEvent = 'opened' | 'closed';

/** One send attempt, the same shape as a task's record minus the task fields. */
export interface TicketWhatsappRecord {
  status: Exclude<CustomerWhatsappState, 'waiting'>;
  updatedAt: string;
  phone?: string | null;
  reason?: string | null;
  providerMessageId?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
}

/** Stored on `service_tickets.customer_whatsapp`. */
export type TicketCustomerWhatsapp = Partial<
  Record<MaintenanceWhatsappEvent, TicketWhatsappRecord>
>;

/** What the API returns for the detail screens. */
export type TicketCustomerWhatsappStatus = Record<
  MaintenanceWhatsappEvent,
  CustomerWhatsappStatus | null
>;

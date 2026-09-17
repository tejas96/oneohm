import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { COMPANY, MAINTENANCE_LEAD_DAYS, MAINTENANCE_VISIT_COUNT } from '@tejas96/shared/constants';
import {
  IntegrationProvider,
  MessageType,
  ProjectStatus,
  ServiceTicketKind,
  ServiceTicketPriority,
  ServiceTicketStatus,
  type MaintenanceWhatsappEvent,
  type TicketWhatsappRecord,
} from '@tejas96/shared/types';
import {
  addDaysToIsoDate,
  emptyMaintenanceChecklist,
  indiaHour,
  indiaToday,
  nextMaintenanceVisit,
  normalizePhoneToE164,
} from '@tejas96/shared/utils';
import { DataSource, QueryFailedError } from 'typeorm';

import { IntegrationService } from '../../integrations/services';
import {
  MAINTENANCE_CLOSED_TEMPLATE,
  MAINTENANCE_CRON,
  MAINTENANCE_MAX_AGE_HOURS,
  MAINTENANCE_OPENED_TEMPLATE,
  MAINTENANCE_SEND_BATCH_SIZE,
  MAINTENANCE_SEND_HOUR_END,
  MAINTENANCE_SEND_HOUR_START,
  MAINTENANCE_STUCK_MINUTES,
  MAINTENANCE_TIMEZONE,
} from '../constants/maintenance.constants';
import { ServiceTicketEntity, ServiceTicketStatusHistoryEntity } from '../entities';
import { ServiceTicketRepository } from '../repositories';

interface CompletedProject {
  projectId: string;
  customerId: string;
  endDate: string;
}

/**
 * Routine checkups: makes the next visit for each completed project 14 days
 * before it is due, and (Task 5) WhatsApps the customer when a checkup opens
 * and when it is done.
 *
 * Only the NEXT visit is ever made, so a project completed 13 months ago starts
 * at visit 5. The unique index on (project_id, visit_number) is the real guard
 * against doubles; the pre-read below only saves pointless ticket-number locks.
 */
@Injectable()
export class MaintenanceTicketService {
  private readonly logger = new Logger(MaintenanceTicketService.name);
  private running = false;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly ticketRepository: ServiceTicketRepository,
    private readonly integrationService: IntegrationService,
  ) {}

  @Cron(MAINTENANCE_CRON, { name: 'service-tickets:maintenance', timeZone: MAINTENANCE_TIMEZONE })
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.step('create visits', () => this.createDueVisits());
      if (this.sendsAllowed()) {
        await this.step('unstick sends', () => this.unstick());
        await this.step('send opened', () => this.send('opened'));
        await this.step('send closed', () => this.send('closed'));
      }
    } finally {
      this.running = false;
    }
  }

  /**
   * The local database is a production restore with real phones, so sends need
   * production or the explicit local flag. No start date means Meta has not
   * approved the templates yet: sending would fail and never be retried.
   */
  private sendsAllowed(): boolean {
    if (process.env.NODE_ENV !== 'production' && process.env.TASK_WHATSAPP_ALLOW_LOCAL !== 'true') {
      return false;
    }
    if (!this.sendSince()) return false;
    const hour = indiaHour();
    return hour >= MAINTENANCE_SEND_HOUR_START && hour < MAINTENANCE_SEND_HOUR_END;
  }

  private sendSince(): Date | null {
    const raw = process.env.MAINTENANCE_WHATSAPP_SINCE;
    if (!raw) return null;
    const since = new Date(raw);
    return Number.isFinite(since.getTime()) ? since : null;
  }

  /** One step failing is logged and does not stop the next. */
  private async step(name: string, work: () => Promise<void>): Promise<void> {
    try {
      await work();
    } catch (error) {
      this.logger.error(`Maintenance job step "${name}" failed`, error);
    }
  }

  private async createDueVisits(): Promise<void> {
    const today = indiaToday();
    const horizon = addDaysToIsoDate(today, MAINTENANCE_LEAD_DAYS);

    const projects: CompletedProject[] = await this.dataSource.query(
      `SELECT p.id AS "projectId",
              cp.customer_id AS "customerId",
              to_char(p.end_date, 'YYYY-MM-DD') AS "endDate"
         FROM projects p
         JOIN customer_properties cp ON cp.id = p.property_id
        WHERE p.deleted_at IS NULL
          AND p.status = 'completed'
          AND p.end_date IS NOT NULL
          AND p.end_date > (CURRENT_DATE - make_interval(months => $1::int * 3 + 1))`,
      [MAINTENANCE_VISIT_COUNT],
    );

    const existingRows: { projectId: string; visitNumber: number }[] = await this.dataSource.query(
      `SELECT project_id AS "projectId", visit_number AS "visitNumber"
         FROM service_tickets
        WHERE kind = 'maintenance'`,
    );
    const existing = new Set(existingRows.map((row) => `${row.projectId}:${row.visitNumber}`));

    let created = 0;
    for (const project of projects) {
      const next = nextMaintenanceVisit(project.endDate, today);
      if (!next || next.dueDate > horizon) continue;
      if (existing.has(`${project.projectId}:${next.visitNumber}`)) continue;
      if (await this.createVisit(project, next.visitNumber, next.dueDate)) created += 1;
    }

    if (created > 0) this.logger.log(`Created ${created} routine checkup ticket(s)`);
  }

  private async createVisit(
    project: CompletedProject,
    visitNumber: number,
    dueDate: string,
  ): Promise<boolean> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const ticketNumber = await this.ticketRepository.generateTicketNumber(
          COMPANY.code,
          manager,
        );
        const saved = await manager.save(
          ServiceTicketEntity,
          manager.create(ServiceTicketEntity, {
            ticketNumber,
            kind: ServiceTicketKind.MAINTENANCE,
            visitNumber,
            title: `Routine checkup ${visitNumber} of ${MAINTENANCE_VISIT_COUNT}`,
            description: `Routine solar checkup, visit ${visitNumber} of ${MAINTENANCE_VISIT_COUNT}. Fill the inspection checklist before resolving.`,
            priority: ServiceTicketPriority.MEDIUM,
            status: ServiceTicketStatus.OPEN,
            customerId: project.customerId,
            projectId: project.projectId,
            assignedToEmployeeId: null,
            assignedAt: null,
            dueDate,
            photos: null,
            checklist: emptyMaintenanceChecklist(),
            customerWhatsapp: null,
            createdBy: null,
            updatedBy: null,
          }),
        );
        await manager.save(ServiceTicketStatusHistoryEntity, {
          ticketId: saved.id,
          fromStatus: null,
          toStatus: ServiceTicketStatus.OPEN,
          note: null,
          changedBy: null,
        });
      });
      return true;
    } catch (error) {
      // Another instance made this visit first.
      if (error instanceof QueryFailedError && (error as { code?: string }).code === '23505') {
        return false;
      }
      throw error;
    }
  }

  private async unstick(): Promise<void> {
    for (const event of ['opened', 'closed'] as const) {
      const result: unknown = await this.dataSource.query(
        `UPDATE service_tickets
            SET customer_whatsapp = jsonb_set(
                  customer_whatsapp, '{${event}}',
                  (customer_whatsapp -> '${event}') || jsonb_build_object(
                    'status', 'failed', 'reason', 'Send interrupted',
                    'updatedAt', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
          WHERE customer_whatsapp -> '${event}' ->> 'status' = 'sending'
            AND (customer_whatsapp -> '${event}' ->> 'updatedAt')::timestamptz
                < now() - make_interval(mins => $1)`,
        [MAINTENANCE_STUCK_MINUTES],
      );
      const stranded = Array.isArray(result) && typeof result[1] === 'number' ? result[1] : 0;
      if (stranded > 0) {
        this.logger.error(
          `${stranded} checkup "${event}" WhatsApp(s) were interrupted mid-send and will not be retried.`,
        );
      }
    }
  }

  /** When the event happened: creation for opened, first of resolved/closed for closed. */
  private eventTimeSql(event: MaintenanceWhatsappEvent): string {
    return event === 'opened' ? 't.created_at' : 'LEAST(t.resolved_at, t.closed_at)';
  }

  private async send(event: MaintenanceWhatsappEvent): Promise<void> {
    const since = this.sendSince() as Date;
    const statusFilter = event === 'closed' ? `AND t.status IN ('resolved', 'closed')` : '';

    const due: { ticketId: string; eventAt: Date }[] = await this.dataSource.query(
      `SELECT t.id AS "ticketId", ${this.eventTimeSql(event)} AS "eventAt"
         FROM service_tickets t
        WHERE t.kind = 'maintenance'
          AND t.deleted_at IS NULL
          ${statusFilter}
          AND ${this.eventTimeSql(event)} IS NOT NULL
          AND ${this.eventTimeSql(event)} >= $1
          AND t.customer_whatsapp -> '${event}' IS NULL
        ORDER BY 2 ASC
        LIMIT $2`,
      [since, MAINTENANCE_SEND_BATCH_SIZE],
    );

    for (const ticket of due) {
      await this.process(event, ticket.ticketId, new Date(ticket.eventAt));
    }
  }

  /** A single UPDATE whose WHERE repeats the due test, so only one instance wins. */
  private async claim(event: MaintenanceWhatsappEvent, ticketId: string): Promise<boolean> {
    const rows: unknown[] = await this.dataSource.query(
      `UPDATE service_tickets
          SET customer_whatsapp = jsonb_set(
                COALESCE(customer_whatsapp, '{}'::jsonb), '{${event}}',
                jsonb_build_object(
                  'status', 'sending',
                  'updatedAt', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
        WHERE id = $1
          AND customer_whatsapp -> '${event}' IS NULL
       RETURNING id`,
      [ticketId],
    );
    return rows.length > 0;
  }

  /** Applies only while still `sending`, so a webhook outcome is never overwritten. */
  private async record(
    event: MaintenanceWhatsappEvent,
    ticketId: string,
    patch: Partial<TicketWhatsappRecord>,
  ): Promise<void> {
    await this.dataSource.query(
      `UPDATE service_tickets
          SET customer_whatsapp = jsonb_set(
                customer_whatsapp, '{${event}}', (customer_whatsapp -> '${event}') || $2::jsonb)
        WHERE id = $1
          AND customer_whatsapp -> '${event}' ->> 'status' = 'sending'`,
      [ticketId, JSON.stringify({ ...patch, updatedAt: new Date().toISOString() })],
    );
  }

  private async process(
    event: MaintenanceWhatsappEvent,
    ticketId: string,
    eventAt: Date,
  ): Promise<void> {
    if (!(await this.claim(event, ticketId))) return;

    try {
      const rows: {
        projectStatus: ProjectStatus;
        projectNumber: string;
        projectName: string | null;
        firstName: string | null;
        phone: string | null;
        dueDate: string | null;
      }[] = await this.dataSource.query(
        `SELECT p.status AS "projectStatus", p.project_number AS "projectNumber",
                p.name AS "projectName", c.first_name AS "firstName", c.phone AS "phone",
                to_char(t.due_date, 'YYYY-MM-DD') AS "dueDate"
           FROM service_tickets t
           JOIN projects p          ON p.id = t.project_id
           JOIN customer_profiles c ON c.id = t.customer_id
          WHERE t.id = $1`,
        [ticketId],
      );
      const context = rows[0];
      const phone = normalizePhoneToE164(context?.phone);

      const skip = !context
        ? 'Ticket not found'
        : context.projectStatus === ProjectStatus.CANCELLED
          ? 'Project cancelled'
          : Date.now() - eventAt.getTime() > MAINTENANCE_MAX_AGE_HOURS * 3_600_000
            ? `More than ${MAINTENANCE_MAX_AGE_HOURS} hours old`
            : !/^\+\d{11,15}$/.test(phone)
              ? 'No valid phone'
              : null;
      if (skip || !context) {
        await this.record(event, ticketId, {
          status: 'skipped',
          reason: skip ?? 'Ticket not found',
        });
        return;
      }

      const template =
        event === 'opened' ? MAINTENANCE_OPENED_TEMPLATE : MAINTENANCE_CLOSED_TEMPLATE;
      const projectName = (context.projectName ?? '').replace(/\s+/g, ' ').trim();
      const body: Record<string, string> = {
        customer_name: context.firstName?.trim() || 'Customer',
        project_name: projectName ? `"${projectName}"` : context.projectNumber,
      };
      if (event === 'opened') {
        body.due_date = formatIndiaDate(context.dueDate ? `${context.dueDate}T12:00:00Z` : eventAt);
      } else {
        body.visit_date = formatIndiaDate(eventAt);
      }

      const result = await this.integrationService.sendTemplateMessage(
        {
          to: phone,
          type: MessageType.TEMPLATE,
          templateName: template.name,
          templateLanguage: template.language,
          templateParameters: { body },
          metadata: { entityType: 'service_ticket', entityId: ticketId },
        },
        IntegrationProvider.WHATSAPP_BUSINESS,
      );

      await this.record(event, ticketId, {
        status: 'sent',
        providerMessageId: result.messageId,
        sentAt: new Date().toISOString(),
        phone,
        reason: null,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Send failed';
      await this.record(event, ticketId, { status: 'failed', reason });
      this.logger.warn(`Checkup "${event}" WhatsApp for ticket ${ticketId} failed: ${reason}`);
    }
  }
}

/** "17 Dec 2026", in India time. */
function formatIndiaDate(value: Date | string): string {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

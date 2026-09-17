import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { COMPANY, MAINTENANCE_LEAD_DAYS, MAINTENANCE_VISIT_COUNT } from '@tejas96/shared/constants';
import {
  ServiceTicketKind,
  ServiceTicketPriority,
  ServiceTicketStatus,
} from '@tejas96/shared/types';
import {
  addDaysToIsoDate,
  emptyMaintenanceChecklist,
  indiaToday,
  nextMaintenanceVisit,
} from '@tejas96/shared/utils';
import { DataSource, QueryFailedError } from 'typeorm';

import { MAINTENANCE_CRON, MAINTENANCE_TIMEZONE } from '../constants/maintenance.constants';
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
  ) {}

  @Cron(MAINTENANCE_CRON, { name: 'service-tickets:maintenance', timeZone: MAINTENANCE_TIMEZONE })
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.step('create visits', () => this.createDueVisits());
    } finally {
      this.running = false;
    }
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
}

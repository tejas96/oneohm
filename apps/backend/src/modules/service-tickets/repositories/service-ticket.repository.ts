import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ACTIVE_TICKET_STATUSES, ServiceTicketPriority } from '@tejas96/shared/types';
import { type EntityManager, Repository, type SelectQueryBuilder } from 'typeorm';

import { type ServiceTicketQueryDto } from '../dto';
import { ServiceTicketEntity } from '../entities';

/**
 * Whitelist of sortable fields. Anything not listed falls back to createdAt —
 * the query builder would otherwise interpolate an arbitrary client string.
 */
const SORT_FIELD_MAP: Record<string, string> = {
  createdAt: 'ticket.createdAt',
  ticketNumber: 'ticket.ticketNumber',
  title: 'ticket.title',
  status: 'ticket.status',
  priority: 'ticket.priority',
  dueDate: 'ticket.dueDate',
};

@Injectable()
export class ServiceTicketRepository {
  constructor(
    @InjectRepository(ServiceTicketEntity)
    private readonly repository: Repository<ServiceTicketEntity>,
  ) {}

  /**
   * Generate the next ticket number.
   *
   * MUST be called with `manager` — i.e. inside a transaction — or the advisory
   * lock below releases immediately and buys nothing.
   *
   * Why an advisory lock and not `SELECT … FOR UPDATE`: a row lock only locks
   * rows that already exist. Two concurrent creates both read the same latest
   * ticket, both compute the same next number, and the loser dies on
   * `uq_service_tickets_number`. Measured: 10 parallel creates produced 2
   * successes and 8 duplicate-key 500s. The advisory lock covers the gap where
   * the row being contended does not exist yet, and Postgres releases it
   * automatically at commit or rollback.
   *
   * The lock is keyed on the prefix, so it serialises only creates competing
   * for the same year's sequence.
   *
   * `withDeleted()` matters separately: a soft-deleted ticket keeps its number,
   * so the scan has to see it or the next create would reuse and collide.
   */
  async generateTicketNumber(companyCode: string, manager?: EntityManager): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `TKT-${companyCode}-${year}`;

    const repo = manager ? manager.getRepository(ServiceTicketEntity) : this.repository;

    await repo.query('SELECT pg_advisory_xact_lock(hashtext($1))', [prefix]);

    const latest = await repo
      .createQueryBuilder('ticket')
      .withDeleted()
      .where('ticket.ticketNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('ticket.ticketNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (latest?.ticketNumber) {
      const parts = latest.ticketNumber.split('-');
      sequence = parseInt(parts[parts.length - 1] || '0', 10) + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  }

  private baseQuery(): SelectQueryBuilder<ServiceTicketEntity> {
    return (
      this.repository
        .createQueryBuilder('ticket')
        .leftJoinAndSelect('ticket.customer', 'customer')
        .leftJoinAndSelect('ticket.project', 'project')
        .leftJoinAndSelect('project.property', 'property')
        .leftJoinAndSelect('ticket.assignedToEmployee', 'assignee')
        // The employee row carries no name — it hangs off the user. Without this
        // join the mapper falls back to "Unnamed employee" on every list row and
        // in all three entity tabs, while the detail screen showed the real name.
        .leftJoinAndSelect('assignee.user', 'assigneeUser')
        .leftJoinAndSelect('ticket.createdByUser', 'creator')
        .where('ticket.deletedAt IS NULL')
    );
  }

  async findPaginated(
    query: ServiceTicketQueryDto,
  ): Promise<{ items: ServiceTicketEntity[]; total: number }> {
    const qb = this.baseQuery();

    if (query.status?.length) {
      qb.andWhere('ticket.status IN (:...statuses)', { statuses: query.status });
    }
    if (query.priority?.length) {
      qb.andWhere('ticket.priority IN (:...priorities)', { priorities: query.priority });
    }
    if (query.customerId) {
      qb.andWhere('ticket.customerId = :customerId', { customerId: query.customerId });
    }
    if (query.projectId) {
      qb.andWhere('ticket.projectId = :projectId', { projectId: query.projectId });
    }
    if (query.propertyId) {
      qb.andWhere('project.property_id = :propertyId', { propertyId: query.propertyId });
    }
    if (query.assigneeId) {
      qb.andWhere('ticket.assignedToEmployeeId = :assigneeId', { assigneeId: query.assigneeId });
    }
    if (query.unassigned) {
      qb.andWhere('ticket.assignedToEmployeeId IS NULL').andWhere(
        'ticket.status IN (:...unassignedStatuses)',
        { unassignedStatuses: [...ACTIVE_TICKET_STATUSES] },
      );
    }
    if (query.overdue) {
      qb.andWhere('ticket.dueDate IS NOT NULL')
        .andWhere('ticket.dueDate < CURRENT_DATE')
        .andWhere('ticket.status IN (:...overdueStatuses)', {
          overdueStatuses: [...ACTIVE_TICKET_STATUSES],
        });
    }
    if (query.createdBy) {
      qb.andWhere('ticket.createdBy = :createdBy', { createdBy: query.createdBy });
    }
    if (query.search) {
      qb.andWhere('(ticket.title ILIKE :search OR ticket.ticketNumber ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    if (query.fromDate) {
      qb.andWhere('ticket.createdAt >= :fromDate', { fromDate: query.fromDate });
    }
    if (query.toDate) {
      // Inclusive of the whole end day, so a same-day range returns that day's rows.
      qb.andWhere("ticket.createdAt < (CAST(:toDate AS date) + INTERVAL '1 day')", {
        toDate: query.toDate,
      });
    }

    const sortField = SORT_FIELD_MAP[query.sortBy] ?? 'ticket.createdAt';
    const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    if (sortField === 'ticket.dueDate') {
      qb.orderBy(sortField, sortOrder, 'NULLS LAST');
    } else {
      qb.orderBy(sortField, sortOrder);
    }
    qb.skip((query.page - 1) * query.limit).take(query.limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findById(id: string): Promise<ServiceTicketEntity | null> {
    return this.baseQuery()
      .leftJoinAndSelect('ticket.statusHistory', 'history')
      .leftJoinAndSelect('history.changedByUser', 'historyUser')
      .andWhere('ticket.id = :id', { id })
      .orderBy('history.createdAt', 'ASC')
      .getOne();
  }

  async getStats(): Promise<{
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    urgent: number;
    unassigned: number;
    overdue: number;
  }> {
    const rows = await this.repository
      .createQueryBuilder('ticket')
      .select('ticket.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .where('ticket.deletedAt IS NULL')
      .groupBy('ticket.status')
      .getRawMany<{ status: string; count: number }>();

    const byStatus = new Map(rows.map((row) => [row.status, Number(row.count)]));

    const urgent = await this.repository
      .createQueryBuilder('ticket')
      .where('ticket.deletedAt IS NULL')
      .andWhere('ticket.priority = :priority', { priority: ServiceTicketPriority.URGENT })
      .andWhere('ticket.status IN (:...statuses)', { statuses: [...ACTIVE_TICKET_STATUSES] })
      .getCount();

    const unassigned = await this.repository
      .createQueryBuilder('ticket')
      .where('ticket.deletedAt IS NULL')
      .andWhere('ticket.assignedToEmployeeId IS NULL')
      .andWhere('ticket.status IN (:...statuses)', { statuses: [...ACTIVE_TICKET_STATUSES] })
      .getCount();

    const overdue = await this.repository
      .createQueryBuilder('ticket')
      .where('ticket.deletedAt IS NULL')
      .andWhere('ticket.dueDate IS NOT NULL')
      .andWhere('ticket.dueDate < CURRENT_DATE')
      .andWhere('ticket.status IN (:...statuses)', { statuses: [...ACTIVE_TICKET_STATUSES] })
      .getCount();

    return {
      open: byStatus.get('open') ?? 0,
      inProgress: byStatus.get('in_progress') ?? 0,
      resolved: byStatus.get('resolved') ?? 0,
      closed: byStatus.get('closed') ?? 0,
      urgent,
      unassigned,
      overdue,
    };
  }
}

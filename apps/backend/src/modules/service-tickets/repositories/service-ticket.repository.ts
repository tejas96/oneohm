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
};

@Injectable()
export class ServiceTicketRepository {
  constructor(
    @InjectRepository(ServiceTicketEntity)
    private readonly repository: Repository<ServiceTicketEntity>,
  ) {}

  /**
   * Generate the next ticket number. Must run inside a transaction so the
   * pessimistic lock actually serialises concurrent creates.
   *
   * `withDeleted()` matters: a soft-deleted ticket keeps its number, so the
   * sequence has to see it or the next create would collide on the unique index.
   */
  async generateTicketNumber(companyCode: string, manager?: EntityManager): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `TKT-${companyCode}-${year}`;

    const repo = manager ? manager.getRepository(ServiceTicketEntity) : this.repository;

    const latest = await repo
      .createQueryBuilder('ticket')
      .withDeleted()
      .where('ticket.ticketNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('ticket.ticketNumber', 'DESC')
      .setLock('pessimistic_write')
      .getOne();

    let sequence = 1;
    if (latest?.ticketNumber) {
      const parts = latest.ticketNumber.split('-');
      sequence = parseInt(parts[parts.length - 1] || '0', 10) + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  }

  private baseQuery(): SelectQueryBuilder<ServiceTicketEntity> {
    return this.repository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.customer', 'customer')
      .leftJoinAndSelect('ticket.project', 'project')
      .leftJoinAndSelect('project.property', 'property')
      .leftJoinAndSelect('ticket.assignedToEmployee', 'assignee')
      .where('ticket.deletedAt IS NULL');
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
    qb.orderBy(sortField, query.sortOrder === 'ASC' ? 'ASC' : 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findById(id: string): Promise<ServiceTicketEntity | null> {
    return this.baseQuery()
      .leftJoinAndSelect('ticket.statusHistory', 'history')
      .leftJoinAndSelect('history.changedByUser', 'historyUser')
      .leftJoinAndSelect('ticket.createdByUser', 'creator')
      .leftJoinAndSelect('assignee.user', 'assigneeUser')
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

    return {
      open: byStatus.get('open') ?? 0,
      inProgress: byStatus.get('in_progress') ?? 0,
      resolved: byStatus.get('resolved') ?? 0,
      closed: byStatus.get('closed') ?? 0,
      urgent,
    };
  }
}

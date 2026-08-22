import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FollowupStatus } from '@tejas96/shared/types';
import {
  type EntityManager,
  IsNull,
  LessThan,
  MoreThanOrEqual,
  Not,
  And,
  Repository,
} from 'typeorm';

import { CUSTOMER_LEAD_NEEDS_FOLLOWUP, PROPERTY_NEEDS_FOLLOWUP } from './followup-predicates';
import { FollowupEntity } from '../entities/followup.entity';

/** One open lead unit that nobody currently owes an action. */
export interface FollowupGapRow {
  kind: 'customer' | 'property';
  customerId: string;
  propertyId: string | null;
  name: string;
  leadTemperature: string | null;
  attributedUserId: string | null;
}

@Injectable()
export class FollowupRepository {
  constructor(
    @InjectRepository(FollowupEntity)
    public readonly repository: Repository<FollowupEntity>,
  ) {}

  /**
   * Find followup by ID
   */
  async findById(id: string): Promise<FollowupEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['customer', 'property', 'assignedToUser'],
    });
  }

  /**
   * Find all followups with pagination
   */
  async findAll(page = 1, limit = 20): Promise<[FollowupEntity[], number]> {
    return this.repository.findAndCount({
      where: { deletedAt: IsNull() },
      relations: ['customer', 'property', 'assignedToUser'],
      skip: (page - 1) * limit,
      take: limit,
      order: { scheduledAt: 'ASC' },
    });
  }

  /**
   * Find followups with filters
   */
  async findWithFilters(
    filters: {
      status?: FollowupStatus;
      assignedToUserId?: string;
      customerId?: string;
      propertyId?: string;
      priority?: string;
      from?: Date;
      to?: Date;
    },
    page = 1,
    limit = 20,
  ): Promise<[FollowupEntity[], number]> {
    const where: Record<string, unknown> = {
      deletedAt: IsNull(),
    };

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.assignedToUserId) {
      where.assignedToUserId = filters.assignedToUserId;
    }
    if (filters.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters.propertyId) {
      where.propertyId = filters.propertyId;
    }
    if (filters.priority) {
      where.priority = filters.priority;
    }
    if (filters.from && filters.to) {
      // Exclusive end on `to` matches `/followups/today` (`< startOfTomorrow`).
      where.scheduledAt = And(MoreThanOrEqual(filters.from), LessThan(filters.to));
    } else if (filters.from) {
      where.scheduledAt = MoreThanOrEqual(filters.from);
    } else if (filters.to) {
      where.scheduledAt = LessThan(filters.to);
    }

    return this.repository.findAndCount({
      where,
      relations: ['customer', 'property', 'assignedToUser'],
      skip: (page - 1) * limit,
      take: limit,
      order: { scheduledAt: 'ASC' },
    });
  }

  /**
   * Find followups assigned to a specific user
   */
  async findByAssignedUser(
    assignedToUserId: string,
    status?: FollowupStatus,
    page = 1,
    limit = 20,
  ): Promise<[FollowupEntity[], number]> {
    const where: Record<string, unknown> = {
      assignedToUserId,
      deletedAt: IsNull(),
    };

    if (status) {
      where.status = status;
    }

    return this.repository.findAndCount({
      where,
      relations: ['customer', 'property'],
      skip: (page - 1) * limit,
      take: limit,
      order: { scheduledAt: 'ASC' },
    });
  }

  /**
   * Find today's followups, optionally scoped to one user
   */
  async findTodayFollowups(
    assignedToUserId?: string,
    page = 1,
    limit = 20,
  ): Promise<[FollowupEntity[], number]> {
    /*
      THE DAY BOUNDARY IS COMPUTED BY THE DATABASE, not by this process.

      This used to build the boundary from `new Date()`, which resolves in the
      Node process's timezone, while `getSummary` below has always used
      `date_trunc('day', now())`, which resolves in the database's. With the
      API in IST and Postgres in UTC the two disagreed by five and a half
      hours, so `/followups/summary` and `/followups/today` returned different
      answers for the same question — a count of 2 above a list of 1 on My Day.

      One basis, and it is the database's, because that is where `scheduled_at`
      is stored and compared.
    */
    return this.scopedByDay(
      "followup.scheduledAt >= date_trunc('day', now()) " +
        "AND followup.scheduledAt < date_trunc('day', now()) + interval '1 day'",
      assignedToUserId,
      page,
      limit,
    );
  }

  /**
   * Shared by today and overdue so the two can never drift apart again.
   *
   * `where` is a fragment over `followup.scheduledAt`, evaluated in the
   * database.
   */
  private scopedByDay(
    scheduledAtClause: string,
    assignedToUserId: string | undefined,
    page: number,
    limit: number,
  ): Promise<[FollowupEntity[], number]> {
    const qb = this.repository
      .createQueryBuilder('followup')
      .leftJoinAndSelect('followup.customer', 'customer')
      .leftJoinAndSelect('followup.property', 'property')
      .leftJoinAndSelect('followup.assignedToUser', 'assignedToUser')
      .where('followup.deletedAt IS NULL')
      .andWhere('followup.status = :status', { status: FollowupStatus.PENDING })
      .andWhere(scheduledAtClause);

    if (assignedToUserId) {
      qb.andWhere('followup.assignedToUserId = :assignedToUserId', { assignedToUserId });
    }

    return qb
      .orderBy('followup.scheduledAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  /**
   * Find overdue followups (pending and scheduledAt < now)
   */
  async findOverdueFollowups(
    assignedToUserId?: string,
    page = 1,
    limit = 20,
  ): Promise<[FollowupEntity[], number]> {
    /*
      OVERDUE MEANS BEFORE TODAY, NOT BEFORE NOW.

      This compared against `now()`, so a call booked for 09:00 became overdue
      at 09:01 — while `getSummary` counted it as today's until midnight. A
      conversation scheduled for 23:00 today has not been missed at 14:00, and
      the screen that shows both must not say otherwise.
    */
    return this.scopedByDay(
      "followup.scheduledAt < date_trunc('day', now())",
      assignedToUserId,
      page,
      limit,
    );
  }

  /**
   * Find followups by customer
   */
  async findByCustomer(
    customerId: string,
    page = 1,
    limit = 20,
  ): Promise<[FollowupEntity[], number]> {
    return this.repository.findAndCount({
      where: { customerId, deletedAt: IsNull() },
      relations: ['property', 'assignedToUser'],
      skip: (page - 1) * limit,
      take: limit,
      order: { scheduledAt: 'ASC' },
    });
  }

  /**
   * Find followups by property
   */
  async findByProperty(
    propertyId: string,
    page = 1,
    limit = 20,
  ): Promise<[FollowupEntity[], number]> {
    return this.repository.findAndCount({
      where: { propertyId, deletedAt: IsNull() },
      relations: ['customer', 'assignedToUser'],
      skip: (page - 1) * limit,
      take: limit,
      order: { scheduledAt: 'ASC' },
    });
  }

  /**
   * Create a new followup
   */
  async create(data: Partial<FollowupEntity>, manager?: EntityManager): Promise<FollowupEntity> {
    const repo = manager ? manager.getRepository(FollowupEntity) : this.repository;
    const followup = repo.create(data);
    return repo.save(followup);
  }

  /**
   * Update a followup
   *
   * Accepts an EntityManager so completing a followup and creating its
   * successor happen in one transaction — a crash between the two would
   * otherwise leave a lead with nobody owing it an action.
   */
  async update(
    id: string,
    updates: Partial<FollowupEntity>,
    manager?: EntityManager,
  ): Promise<FollowupEntity | null> {
    const repo = manager ? manager.getRepository(FollowupEntity) : this.repository;
    await repo.update({ id }, updates as Record<string, unknown>);
    return repo.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['customer', 'property', 'assignedToUser'],
    });
  }

  /**
   * Soft delete a followup
   */
  async softDelete(id: string, deletedBy?: string): Promise<boolean> {
    const result = await this.repository.update(
      { id },
      {
        deletedAt: new Date(),
        updatedBy: deletedBy,
      },
    );
    return (result.affected ?? 0) > 0;
  }

  /**
   * How many pending followups a lead unit still has.
   *
   * `excludeId` lets a followup that is mid-completion avoid counting itself,
   * which is how the service decides whether a next followup is mandatory.
   */
  async countPendingForUnit(
    customerId: string,
    propertyId: string | null,
    excludeId?: string,
  ): Promise<number> {
    return this.repository.count({
      where: {
        customerId,
        // A customer-level chain must not match property rows, and vice versa.
        propertyId: propertyId === null ? IsNull() : propertyId,
        status: FollowupStatus.PENDING,
        deletedAt: IsNull(),
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });
  }

  /**
   * Open lead units with zero pending followups — the safety net.
   *
   * Two branches unioned: properties that are still open, and customers who
   * have no property at all. Records arrive by import and direct API call and
   * never pass the UI gates, so rather than pretend enforcement is airtight,
   * whatever slipped surfaces here with a name against it.
   *
   * Attribution falls back from the most recently completed followup's assignee
   * to whoever created the record, so no gap is ownerless.
   */
  async findGaps(): Promise<FollowupGapRow[]> {
    return this.repository.manager.query(`
      SELECT 'property' AS kind,
             p.customer_id AS "customerId",
             p.id          AS "propertyId",
             COALESCE(NULLIF(p.property_name, ''), p.city, 'Unnamed property') AS name,
             p.lead_temperature AS "leadTemperature",
             COALESCE(
               (SELECT f.assigned_to_user_id
                  FROM followups f
                 WHERE f.property_id = p.id
                   AND f.deleted_at IS NULL
                   AND f.status = 'completed'
                 ORDER BY f.completed_at DESC NULLS LAST
                 LIMIT 1),
               p.created_by
             ) AS "attributedUserId"
        FROM customer_properties p
       WHERE ${PROPERTY_NEEDS_FOLLOWUP('p')}

      UNION ALL

      SELECT 'customer' AS kind,
             c.id  AS "customerId",
             NULL  AS "propertyId",
             TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')) AS name,
             NULL  AS "leadTemperature",
             COALESCE(
               (SELECT f.assigned_to_user_id
                  FROM followups f
                 WHERE f.customer_id = c.id
                   AND f.deleted_at IS NULL
                   AND f.status = 'completed'
                 ORDER BY f.completed_at DESC NULLS LAST
                 LIMIT 1),
               c.created_by
             ) AS "attributedUserId"
        FROM customer_profiles c
       WHERE ${CUSTOMER_LEAD_NEEDS_FOLLOWUP('c')}
    `);
  }

  /**
   * Counts for the nav badge. `userId` null means everyone's followups.
   */
  async summaryCounts(userId: string | null): Promise<{
    overdue: number;
    today: number;
    upcoming: number;
  }> {
    const rows: Array<{ overdue: string; today: string; upcoming: string }> =
      await this.repository.manager.query(
        `
      SELECT
        COUNT(*) FILTER (WHERE f.scheduled_at < date_trunc('day', now())) AS overdue,
        COUNT(*) FILTER (WHERE f.scheduled_at >= date_trunc('day', now())
                           AND f.scheduled_at <  date_trunc('day', now()) + interval '1 day') AS today,
        COUNT(*) FILTER (WHERE f.scheduled_at >= date_trunc('day', now()) + interval '1 day') AS upcoming
      FROM followups f
      WHERE f.deleted_at IS NULL
        AND f.status = 'pending'
        AND ($1::uuid IS NULL OR f.assigned_to_user_id = $1::uuid)
    `,
        [userId],
      );

    // Postgres COUNT comes back as a string.
    const row = rows[0];
    return {
      overdue: Number(row?.overdue ?? 0),
      today: Number(row?.today ?? 0),
      upcoming: Number(row?.upcoming ?? 0),
    };
  }

  /**
   * Cancels every pending followup on a lead unit. Called when the unit reaches
   * a terminal state, so a won or dead deal stops nagging without a second click.
   */
  async cancelPendingFor(
    customerId: string,
    propertyId: string | null,
    updatedBy: string,
    manager?: EntityManager,
  ): Promise<number> {
    const repo = manager ? manager.getRepository(FollowupEntity) : this.repository;
    const result = await repo
      .createQueryBuilder()
      .update(FollowupEntity)
      .set({ status: FollowupStatus.CANCELLED, updatedBy })
      .where('customer_id = :customerId', { customerId })
      .andWhere(propertyId === null ? 'property_id IS NULL' : 'property_id = :propertyId', {
        propertyId,
      })
      .andWhere('status = :pending', { pending: FollowupStatus.PENDING })
      .andWhere('deleted_at IS NULL')
      .execute();

    return result.affected ?? 0;
  }
}

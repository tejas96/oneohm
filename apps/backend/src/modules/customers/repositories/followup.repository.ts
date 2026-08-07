import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FollowupStatus } from '@tejas96/shared/types';
import { Between, IsNull, LessThan, MoreThanOrEqual, Repository } from 'typeorm';

import { FollowupEntity } from '../entities/followup.entity';

@Injectable()
export class FollowupRepository {
  constructor(
    @InjectRepository(FollowupEntity)
    public readonly repository: Repository<FollowupEntity>,
  ) {}

  /**
   * Find followup by ID within organization
   */
  async findById(id: string): Promise<FollowupEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['customer', 'property', 'assignedToUser'],
    });
  }

  /**
   * Find all followups for an organization with pagination
   */
  async findByOrganization(
    page = 1,
    limit = 20,
  ): Promise<[FollowupEntity[], number]> {
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
      where.scheduledAt = Between(filters.from, filters.to);
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
   * Find today's followups for an organization or user
   */
  async findTodayFollowups(
    assignedToUserId?: string,
    page = 1,
    limit = 20,
  ): Promise<[FollowupEntity[], number]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const where: Record<string, unknown> = {
      scheduledAt: Between(startOfDay, endOfDay),
      status: FollowupStatus.PENDING,
      deletedAt: IsNull(),
    };

    if (assignedToUserId) {
      where.assignedToUserId = assignedToUserId;
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
   * Find overdue followups (pending and scheduledAt < now)
   */
  async findOverdueFollowups(
    assignedToUserId?: string,
    page = 1,
    limit = 20,
  ): Promise<[FollowupEntity[], number]> {
    const now = new Date();

    const where: Record<string, unknown> = {
      scheduledAt: LessThan(now),
      status: FollowupStatus.PENDING,
      deletedAt: IsNull(),
    };

    if (assignedToUserId) {
      where.assignedToUserId = assignedToUserId;
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
  async create(data: Partial<FollowupEntity>): Promise<FollowupEntity> {
    const followup = this.repository.create(data);
    return this.repository.save(followup);
  }

  /**
   * Update a followup
   * Note: Caller must validate organizationId before calling
   */
  async update(
    id: string,
    updates: Partial<FollowupEntity>,
  ): Promise<FollowupEntity | null> {
    await this.repository.update({ id }, updates as Record<string, unknown>);
    return this.repository.findOne({
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
}

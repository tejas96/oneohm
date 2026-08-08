import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  SecurityEventType,
  SecurityEventCategory,
  SecurityEventStatus,
  SecurityEventSeverity,
} from '@tejas96/shared/types';
import { Repository, LessThan, MoreThanOrEqual } from 'typeorm';

import { SecurityEventEntity } from '../entities';

/**
 * Security Event Repository
 * Handles database operations for security events
 */
@Injectable()
export class SecurityEventRepository {
  private readonly logger = new Logger(SecurityEventRepository.name);

  constructor(
    @InjectRepository(SecurityEventEntity)
    public readonly repository: Repository<SecurityEventEntity>,
  ) {}

  /**
   * Create a security event
   */
  async create(data: Partial<SecurityEventEntity>): Promise<SecurityEventEntity> {
    const event = this.repository.create(data);
    return this.repository.save(event);
  }

  /**
   * Find events by user
   */
  async findByUser(
    userId: string,
    options?: {
      eventType?: SecurityEventType;
      since?: Date;
      limit?: number;
    },
  ): Promise<SecurityEventEntity[]> {
    const query = this.repository.createQueryBuilder('event').where('event.userId = :userId', {
      userId,
    });

    if (options?.eventType) {
      query.andWhere('event.eventType = :eventType', { eventType: options.eventType });
    }

    if (options?.since) {
      query.andWhere('event.createdAt >= :since', { since: options.since });
    }

    query.orderBy('event.createdAt', 'DESC');

    if (options?.limit) {
      query.limit(options.limit);
    }

    return query.getMany();
  }

  /**
   * Count events for rate limiting
   * @param filter - Filter criteria
   * @param timeWindow - Time window in seconds (e.g., 60 for last minute)
   */
  async countEvents(
    filter: {
      userId?: string;
      ipAddress?: string;
      eventType?: SecurityEventType;
    },
    timeWindowSeconds: number,
  ): Promise<number> {
    const since = new Date(Date.now() - timeWindowSeconds * 1000);

    const query = this.repository
      .createQueryBuilder('event')
      .where('event.createdAt >= :since', { since });

    if (filter.userId) {
      query.andWhere('event.userId = :userId', { userId: filter.userId });
    }

    if (filter.ipAddress) {
      query.andWhere('event.ipAddress = :ipAddress', { ipAddress: filter.ipAddress });
    }

    if (filter.eventType) {
      query.andWhere('event.eventType = :eventType', { eventType: filter.eventType });
    }

    return query.getCount();
  }

  /**
   * Check if user/IP is blocked
   */
  async isBlocked(userId?: string, ipAddress?: string): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('event')
      .where('event.eventType = :eventType', {
        eventType: SecurityEventType.RATE_LIMIT_BLOCKED,
      })
      .andWhere('event.expiresAt > :now', { now: new Date() })
      .andWhere('event.status = :status', { status: SecurityEventStatus.BLOCKED });

    if (userId) {
      query.andWhere('event.userId = :userId', { userId });
    }

    if (ipAddress) {
      query.andWhere('event.ipAddress = :ipAddress', { ipAddress });
    }

    const blockEvent = await query.getOne();
    return !!blockEvent;
  }

  /**
   * Get failed login attempts count
   */
  async getFailedLoginAttempts(
    identifier: string, // phone or email
    timeWindowSeconds = 300, // 5 minutes
  ): Promise<number> {
    const since = new Date(Date.now() - timeWindowSeconds * 1000);

    return this.repository.count({
      where: {
        eventType: SecurityEventType.LOGIN_FAILED,
        status: SecurityEventStatus.FAILED,
        createdAt: MoreThanOrEqual(since),
        metadata: {
          identifier,
        } as Record<string, unknown>,
      },
    });
  }

  /**
   * Get security events by category for analytics
   */
  async getEventsByCategory(
    startDate: Date,
    endDate: Date,
  ): Promise<
    { category: SecurityEventCategory; count: number; severity: SecurityEventSeverity }[]
  > {
    const results = await this.repository
      .createQueryBuilder('event')
      .select('event.eventCategory', 'category')
      .addSelect('event.severity', 'severity')
      .addSelect('COUNT(*)', 'count')
      .andWhere('event.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('event.eventCategory')
      .addGroupBy('event.severity')
      .getRawMany();

    return results.map((r) => ({
      category: r.category,
      severity: r.severity,
      count: parseInt(r.count, 10),
    }));
  }

  /**
   * Clean up expired events
   */
  async cleanupExpiredEvents(): Promise<number> {
    const result = await this.repository.delete({
      expiresAt: LessThan(new Date()),
    });

    const deletedCount = result.affected || 0;
    if (deletedCount > 0) {
      this.logger.log(`Cleaned up ${deletedCount} expired security events`);
    }

    return deletedCount;
  }

  /**
   * Get suspicious activities
   */
  async getSuspiciousActivities(limit = 50): Promise<SecurityEventEntity[]> {
    return this.repository.find({
      where: {
        eventCategory: SecurityEventCategory.SUSPICIOUS_ACTIVITY,
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });
  }

  /**
   * Get recent events for a user
   */
  async getUserRecentEvents(userId: string, limit = 20): Promise<SecurityEventEntity[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}

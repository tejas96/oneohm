import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';

import { QueryAuditLogsDto } from '../dto/query-audit-logs.dto';
import { AuditLogEntity } from '../entities/audit-log.entity';

/**
 * Repository for Audit Logs
 *
 * Provides comprehensive query methods for audit trail analysis
 */
@Injectable()
export class AuditLogRepository {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly repository: Repository<AuditLogEntity>,
  ) {}

  // ============================================
  // BASIC CRUD
  // ============================================

  async create(auditLog: Partial<AuditLogEntity>): Promise<AuditLogEntity> {
    const entity = this.repository.create(auditLog);
    return this.repository.save(entity);
  }

  async findById(id: string): Promise<AuditLogEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['organization', 'user'],
    });
  }

  async findAll(limit: number = 100): Promise<AuditLogEntity[]> {
    return this.repository.find({
      relations: ['organization', 'user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  /**
   * Find audit logs with complex filters
   */
  async findWithFilters(
    filters: QueryAuditLogsDto,
    limit: number = 100,
  ): Promise<AuditLogEntity[]> {
    const query = this.repository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.organization', 'organization')
      .leftJoinAndSelect('audit.user', 'user');

    if (filters.organizationId) {
      query.andWhere('audit.organization_id = :organizationId', {
        organizationId: filters.organizationId,
      });
    }

    if (filters.entityType) {
      query.andWhere('audit.entity_type = :entityType', { entityType: filters.entityType });
    }

    if (filters.entityId) {
      query.andWhere('audit.entity_id = :entityId', { entityId: filters.entityId });
    }

    if (filters.action) {
      query.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters.userId) {
      query.andWhere('audit.user_id = :userId', { userId: filters.userId });
    }

    if (filters.ipAddress) {
      query.andWhere('audit.ip_address = :ipAddress', { ipAddress: filters.ipAddress });
    }

    if (filters.startDate && filters.endDate) {
      query.andWhere('audit.created_at BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    } else if (filters.startDate) {
      query.andWhere('audit.created_at >= :startDate', { startDate: filters.startDate });
    } else if (filters.endDate) {
      query.andWhere('audit.created_at <= :endDate', { endDate: filters.endDate });
    }

    query.orderBy('audit.created_at', 'DESC').take(limit);

    return query.getMany();
  }

  /**
   * Find audit logs for a specific entity
   */
  async findByEntity(entityType: string, entityId: string): Promise<AuditLogEntity[]> {
    return this.repository.find({
      where: { entityType, entityId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find audit logs for a user
   */
  async findByUser(userId: string, limit: number = 100): Promise<AuditLogEntity[]> {
    return this.repository.find({
      where: { userId },
      relations: ['organization'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find audit logs by organization
   */
  async findByOrganization(organizationId: string, limit: number = 100): Promise<AuditLogEntity[]> {
    return this.repository.find({
      where: { organizationId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find audit logs by action type
   */
  async findByAction(action: string, limit: number = 100): Promise<AuditLogEntity[]> {
    return this.repository.find({
      where: { action },
      relations: ['user', 'organization'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find audit logs within date range
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    limit: number = 100,
  ): Promise<AuditLogEntity[]> {
    return this.repository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
      relations: ['user', 'organization'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find recent audit logs
   */
  async findRecent(limit: number = 50): Promise<AuditLogEntity[]> {
    return this.repository.find({
      relations: ['user', 'organization'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Count audit logs by filters
   */
  async countWithFilters(filters: QueryAuditLogsDto): Promise<number> {
    const query = this.repository.createQueryBuilder('audit');

    if (filters.organizationId) {
      query.andWhere('audit.organization_id = :organizationId', {
        organizationId: filters.organizationId,
      });
    }

    if (filters.entityType) {
      query.andWhere('audit.entity_type = :entityType', { entityType: filters.entityType });
    }

    if (filters.entityId) {
      query.andWhere('audit.entity_id = :entityId', { entityId: filters.entityId });
    }

    if (filters.action) {
      query.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters.userId) {
      query.andWhere('audit.user_id = :userId', { userId: filters.userId });
    }

    if (filters.startDate && filters.endDate) {
      query.andWhere('audit.created_at BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    return query.getCount();
  }

  /**
   * Get action statistics
   */
  async getActionStats(organizationId?: string): Promise<Record<string, number>> {
    const query = this.repository
      .createQueryBuilder('audit')
      .select('audit.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.action');

    if (organizationId) {
      query.where('audit.organization_id = :organizationId', { organizationId });
    }

    const results = await query.getRawMany<{ action: string; count: string }>();

    return results.reduce<Record<string, number>>((acc, row) => {
      acc[row.action] = parseInt(row.count, 10);
      return acc;
    }, {});
  }

  /**
   * Get entity type statistics
   */
  async getEntityTypeStats(organizationId?: string): Promise<Record<string, number>> {
    const query = this.repository
      .createQueryBuilder('audit')
      .select('audit.entity_type', 'entityType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.entity_type');

    if (organizationId) {
      query.where('audit.organization_id = :organizationId', { organizationId });
    }

    const results = await query.getRawMany<{ entityType: string; count: string }>();

    return results.reduce<Record<string, number>>((acc, row) => {
      acc[row.entityType] = parseInt(row.count, 10);
      return acc;
    }, {});
  }
}

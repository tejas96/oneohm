import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { CreateAuditLogDto, QueryAuditLogsDto, AuditLogResponseDto } from '../dto';
import { AuditLogRepository } from '../repositories/audit-log.repository';

/**
 * Service for Audit Logging
 *
 * Provides audit trail creation and querying functionality
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly repository: AuditLogRepository) {}

  /**
   * Create an audit log entry
   */
  async create(createDto: CreateAuditLogDto): Promise<AuditLogResponseDto> {
    const auditLog = await this.repository.create(createDto);

    return plainToInstance(AuditLogResponseDto, auditLog, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Log an entity creation
   */
  async logCreate(
    entityType: string,
    entityId: string,
    newValues: Record<string, unknown>,
    userId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.repository.create({
      entityType,
      entityId,
      action: 'create',
      newValues,
      userId: userId || null,
      metadata: metadata || null,
      oldValues: null,
      ipAddress: null,
      userAgent: null,
    });
  }

  /**
   * Log an entity update
   */
  async logUpdate(
    entityType: string,
    entityId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    userId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.repository.create({
      entityType,
      entityId,
      action: 'update',
      oldValues,
      newValues,
      userId: userId || null,
      metadata: metadata || null,
      ipAddress: null,
      userAgent: null,
    });
  }

  /**
   * Log an entity deletion
   */
  async logDelete(
    entityType: string,
    entityId: string,
    oldValues: Record<string, unknown>,
    userId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.repository.create({
      entityType,
      entityId,
      action: 'delete',
      oldValues,
      userId: userId || null,
      metadata: metadata || null,
      newValues: null,
      ipAddress: null,
      userAgent: null,
    });
  }

  /**
   * Get audit log by ID
   */
  async findById(id: string): Promise<AuditLogResponseDto> {
    const auditLog = await this.repository.findById(id);

    if (!auditLog) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }

    return plainToInstance(AuditLogResponseDto, auditLog, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Query audit logs with filters
   */
  async findWithFilters(
    filters: QueryAuditLogsDto,
    limit: number = 100,
  ): Promise<AuditLogResponseDto[]> {
    const auditLogs = await this.repository.findWithFilters(filters, limit);

    return plainToInstance(AuditLogResponseDto, auditLogs, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all audit logs for a specific entity
   */
  async findByEntity(entityType: string, entityId: string): Promise<AuditLogResponseDto[]> {
    const auditLogs = await this.repository.findByEntity(entityType, entityId);

    return plainToInstance(AuditLogResponseDto, auditLogs, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all audit logs for a user
   */
  async findByUser(userId: string, limit: number = 100): Promise<AuditLogResponseDto[]> {
    const auditLogs = await this.repository.findByUser(userId, limit);

    return plainToInstance(AuditLogResponseDto, auditLogs, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all audit logs for an organization
   */
  async findByOrganization(limit: number = 100): Promise<AuditLogResponseDto[]> {
    const auditLogs = await this.repository.findByOrganization(limit);

    return plainToInstance(AuditLogResponseDto, auditLogs, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get recent audit logs
   */
  async findRecent(limit: number = 50): Promise<AuditLogResponseDto[]> {
    const auditLogs = await this.repository.findRecent(limit);

    return plainToInstance(AuditLogResponseDto, auditLogs, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get action statistics
   */
  async getActionStats(): Promise<Record<string, number>> {
    return this.repository.getActionStats();
  }

  /**
   * Get entity type statistics
   */
  async getEntityTypeStats(): Promise<Record<string, number>> {
    return this.repository.getEntityTypeStats();
  }

  /**
   * Count audit logs with filters
   */
  async countWithFilters(filters: QueryAuditLogsDto): Promise<number> {
    return this.repository.countWithFilters(filters);
  }
}

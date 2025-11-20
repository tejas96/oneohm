import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MaintenanceConfigStatus } from '@oneohm-epc/shared-types';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';


import { ProjectMaintenanceConfigEntity } from '../entities/project-maintenance-config.entity';

/**
 * Repository for Project Maintenance Config Operations
 */
@Injectable()
export class ProjectMaintenanceConfigRepository {
  constructor(
    @InjectRepository(ProjectMaintenanceConfigEntity)
    private readonly repository: Repository<ProjectMaintenanceConfigEntity>,
  ) {}

  /**
   * Create a new maintenance config
   */
  async create(configData: Partial<ProjectMaintenanceConfigEntity>): Promise<ProjectMaintenanceConfigEntity> {
    const config = this.repository.create(configData);
    return this.repository.save(config);
  }

  /**
   * Find all maintenance configs
   */
  async findAll(options?: { relations?: string[] }): Promise<ProjectMaintenanceConfigEntity[]> {
    return this.repository.find({
      relations: options?.relations || [],
    });
  }

  /**
   * Find config by ID
   */
  async findById(
    id: string,
    options?: { relations?: string[] },
  ): Promise<ProjectMaintenanceConfigEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: options?.relations || [],
    });
  }

  /**
   * Find config by project ID
   */
  async findByProjectId(
    projectId: string,
    options?: { relations?: string[] },
  ): Promise<ProjectMaintenanceConfigEntity | null> {
    return this.repository.findOne({
      where: { projectId },
      relations: options?.relations || [],
    });
  }

  /**
   * Find configs by organization
   */
  async findByOrganization(
    organizationId: string,
    options?: { relations?: string[] },
  ): Promise<ProjectMaintenanceConfigEntity[]> {
    return this.repository.find({
      where: { organizationId },
      relations: options?.relations || [],
    });
  }

  /**
   * Find active configs
   */
  async findActive(options?: { relations?: string[] }): Promise<ProjectMaintenanceConfigEntity[]> {
    return this.repository.find({
      where: { status: MaintenanceConfigStatus.ACTIVE },
      relations: options?.relations || [],
    });
  }

  /**
   * Find configs with upcoming maintenance (due date is today or in the past)
   */
  async findUpcomingMaintenance(
    date: Date = new Date(),
    options?: { relations?: string[] },
  ): Promise<ProjectMaintenanceConfigEntity[]> {
    return this.repository.find({
      where: {
        status: MaintenanceConfigStatus.ACTIVE,
        isMaintenanceEnabled: true,
        nextMaintenanceDueDate: LessThanOrEqual(date),
      },
      relations: options?.relations || [],
    });
  }

  /**
   * Find configs without completion date
   */
  async findWithoutCompletionDate(options?: { relations?: string[] }): Promise<ProjectMaintenanceConfigEntity[]> {
    return this.repository.find({
      where: {
        projectCompletionDate: IsNull(),
      },
      relations: options?.relations || [],
    });
  }

  /**
   * Find configs by status
   */
  async findByStatus(
    status: MaintenanceConfigStatus,
    options?: { relations?: string[] },
  ): Promise<ProjectMaintenanceConfigEntity[]> {
    return this.repository.find({
      where: { status },
      relations: options?.relations || [],
    });
  }

  /**
   * Update config
   */
  async update(
    id: string,
    updateData: Partial<ProjectMaintenanceConfigEntity>,
  ): Promise<ProjectMaintenanceConfigEntity | null> {
    await this.repository.update(id, updateData as QueryDeepPartialEntity<ProjectMaintenanceConfigEntity>);
    return this.findById(id);
  }

  /**
   * Delete config (soft delete not applicable, hard delete)
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  /**
   * Count configs by organization
   */
  async countByOrganization(organizationId: string): Promise<number> {
    return this.repository.count({
      where: { organizationId },
    });
  }

  /**
   * Count active configs
   */
  async countActive(): Promise<number> {
    return this.repository.count({
      where: {
        status: MaintenanceConfigStatus.ACTIVE,
        isMaintenanceEnabled: true,
      },
    });
  }

  /**
   * Count overdue maintenances
   */
  async countOverdue(date: Date = new Date()): Promise<number> {
    return this.repository.count({
      where: {
        status: MaintenanceConfigStatus.ACTIVE,
        isMaintenanceEnabled: true,
        nextMaintenanceDueDate: LessThanOrEqual(date),
      },
    });
  }
}


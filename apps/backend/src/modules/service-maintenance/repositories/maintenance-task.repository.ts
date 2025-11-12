import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, LessThanOrEqual, Repository } from 'typeorm';

import { MaintenanceTaskStatus } from '@oneohm-epc/shared-types';

import { MaintenanceTaskEntity } from '../entities/maintenance-task.entity';

/**
 * Repository for Maintenance Task Operations
 */
@Injectable()
export class MaintenanceTaskRepository {
  constructor(
    @InjectRepository(MaintenanceTaskEntity)
    private readonly repository: Repository<MaintenanceTaskEntity>,
  ) {}

  /**
   * Create a new maintenance task
   */
  async create(taskData: Partial<MaintenanceTaskEntity>): Promise<MaintenanceTaskEntity> {
    const task = this.repository.create(taskData);
    return this.repository.save(task);
  }

  /**
   * Find all maintenance tasks
   */
  async findAll(options?: { relations?: string[] }): Promise<MaintenanceTaskEntity[]> {
    return this.repository.find({
      relations: options?.relations || [],
    });
  }

  /**
   * Find task by ID
   */
  async findById(id: string, options?: { relations?: string[] }): Promise<MaintenanceTaskEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: options?.relations || [],
    });
  }

  /**
   * Find tasks by project
   */
  async findByProject(
    projectId: string,
    options?: { relations?: string[] },
  ): Promise<MaintenanceTaskEntity[]> {
    return this.repository.find({
      where: { projectId },
      relations: options?.relations || [],
      order: { scheduledDate: 'ASC' },
    });
  }

  /**
   * Find tasks by maintenance config
   */
  async findByMaintenanceConfig(
    maintenanceConfigId: string,
    options?: { relations?: string[] },
  ): Promise<MaintenanceTaskEntity[]> {
    return this.repository.find({
      where: { maintenanceConfigId },
      relations: options?.relations || [],
      order: { intervalNumber: 'ASC', scheduledDate: 'ASC' },
    });
  }

  /**
   * Find tasks by organization
   */
  async findByOrganization(
    organizationId: string,
    options?: { relations?: string[] },
  ): Promise<MaintenanceTaskEntity[]> {
    return this.repository.find({
      where: { organizationId },
      relations: options?.relations || [],
      order: { scheduledDate: 'DESC' },
    });
  }

  /**
   * Find tasks by assigned user
   */
  async findByAssignedUser(
    assignedToUserId: string,
    options?: { relations?: string[] },
  ): Promise<MaintenanceTaskEntity[]> {
    return this.repository.find({
      where: { assignedToUserId },
      relations: options?.relations || [],
      order: { scheduledDate: 'ASC' },
    });
  }

  /**
   * Find tasks by status
   */
  async findByStatus(
    status: MaintenanceTaskStatus,
    options?: { relations?: string[] },
  ): Promise<MaintenanceTaskEntity[]> {
    return this.repository.find({
      where: { status },
      relations: options?.relations || [],
      order: { scheduledDate: 'ASC' },
    });
  }

  /**
   * Find overdue tasks (scheduled date passed, not completed)
   */
  async findOverdue(options?: { relations?: string[] }): Promise<MaintenanceTaskEntity[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.repository.find({
      where: {
        scheduledDate: LessThanOrEqual(today),
        status: In([
          MaintenanceTaskStatus.SCHEDULED,
          MaintenanceTaskStatus.ASSIGNED,
          MaintenanceTaskStatus.IN_PROGRESS,
        ]),
        completedDate: IsNull(),
      },
      relations: options?.relations || [],
      order: { scheduledDate: 'ASC' },
    });
  }

  /**
   * Find upcoming tasks (scheduled in next N days)
   */
  async findUpcoming(days: number = 7, options?: { relations?: string[] }): Promise<MaintenanceTaskEntity[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);

    return this.repository.find({
      where: {
        scheduledDate: Between(today, futureDate),
        status: In([MaintenanceTaskStatus.SCHEDULED, MaintenanceTaskStatus.ASSIGNED]),
      },
      relations: options?.relations || [],
      order: { scheduledDate: 'ASC' },
    });
  }

  /**
   * Find completed tasks by date range
   */
  async findCompletedInRange(
    startDate: Date,
    endDate: Date,
    options?: { relations?: string[] },
  ): Promise<MaintenanceTaskEntity[]> {
    return this.repository.find({
      where: {
        status: MaintenanceTaskStatus.COMPLETED,
        completedDate: Between(startDate, endDate),
      },
      relations: options?.relations || [],
      order: { completedDate: 'DESC' },
    });
  }

  /**
   * Find unassigned tasks
   */
  async findUnassigned(options?: { relations?: string[] }): Promise<MaintenanceTaskEntity[]> {
    return this.repository.find({
      where: {
        assignedToUserId: IsNull(),
        status: MaintenanceTaskStatus.SCHEDULED,
      },
      relations: options?.relations || [],
      order: { scheduledDate: 'ASC' },
    });
  }

  /**
   * Update task
   */
  async update(id: string, updateData: Partial<MaintenanceTaskEntity>): Promise<MaintenanceTaskEntity | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repository.update(id, updateData as any);
    return this.findById(id);
  }

  /**
   * Delete task (hard delete)
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  /**
   * Count tasks by project
   */
  async countByProject(projectId: string): Promise<number> {
    return this.repository.count({
      where: { projectId },
    });
  }

  /**
   * Count tasks by status
   */
  async countByStatus(status: MaintenanceTaskStatus): Promise<number> {
    return this.repository.count({
      where: { status },
    });
  }

  /**
   * Count overdue tasks
   */
  async countOverdue(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.repository.count({
      where: {
        scheduledDate: LessThanOrEqual(today),
        status: In([
          MaintenanceTaskStatus.SCHEDULED,
          MaintenanceTaskStatus.ASSIGNED,
          MaintenanceTaskStatus.IN_PROGRESS,
        ]),
        completedDate: IsNull(),
      },
    });
  }

  /**
   * Get task statistics for organization
   */
  async getStatsByOrganization(organizationId: string): Promise<Record<string, number>> {
    const tasks = await this.repository.find({
      where: { organizationId },
      select: ['status'],
    });

    return tasks.reduce(
      (acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}


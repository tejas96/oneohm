// ============================================
// IMPORTS
// ============================================
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

// Entities
import { TaskTimeLogEntity } from '../entities/task-time-log.entity';

/**
 * Repository for TaskTimeLogEntity
 * Handles data access for task time logs
 */
@Injectable()
export class TaskTimeLogRepository {
  constructor(
    @InjectRepository(TaskTimeLogEntity)
    private readonly repository: Repository<TaskTimeLogEntity>,
  ) {}

  /**
   * Create a new time log entry
   */
  async create(
    data: Partial<TaskTimeLogEntity>,
  ): Promise<TaskTimeLogEntity> {
    const timeLog = this.repository.create(data);
    return this.repository.save(timeLog);
  }

  /**
   * Find time logs by task ID
   */
  async findByTaskId(taskId: string): Promise<TaskTimeLogEntity[]> {
    return this.repository.find({
      where: { taskId },
      order: { workDate: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Find time logs by user ID
   */
  async findByUserId(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<TaskTimeLogEntity[]> {
    const where: Record<string, unknown> = { userId };

    if (startDate && endDate) {
      where.workDate = Between(startDate, endDate);
    } else if (startDate) {
      where.workDate = MoreThanOrEqual(startDate);
    } else if (endDate) {
      where.workDate = LessThanOrEqual(endDate);
    }

    return this.repository.find({
      where,
      order: { workDate: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Get total hours logged for a task
   */
  async getTotalHoursForTask(taskId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('log')
      .select('SUM(log.time_spent_hours)', 'total')
      .where('log.task_id = :taskId', { taskId })
      .getRawOne<{ total: string }>();

    return result?.total ? parseFloat(result.total) : 0;
  }

  /**
   * Get total hours logged by user for a specific date range
   */
  async getTotalHoursByUser(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('log')
      .select('SUM(log.time_spent_hours)', 'total')
      .where('log.user_id = :userId', { userId })
      .andWhere('log.work_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne<{ total: string }>();

    return result?.total ? parseFloat(result.total) : 0;
  }

  /**
   * Get billable hours for a task
   */
  async getBillableHoursForTask(taskId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('log')
      .select('SUM(log.time_spent_hours)', 'total')
      .where('log.task_id = :taskId', { taskId })
      .andWhere('log.is_billable = :isBillable', { isBillable: true })
      .getRawOne<{ total: string }>();

    return result?.total ? parseFloat(result.total) : 0;
  }

  /**
   * Delete a time log entry
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}


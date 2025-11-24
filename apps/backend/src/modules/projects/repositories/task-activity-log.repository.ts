// ============================================
// IMPORTS
// ============================================
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// Entities
import { TaskActivityLogEntity } from '../entities/task-activity-log.entity';

/**
 * Repository for TaskActivityLogEntity
 * Handles data access for task activity logs
 */
@Injectable()
export class TaskActivityLogRepository {
  constructor(
    @InjectRepository(TaskActivityLogEntity)
    private readonly repository: Repository<TaskActivityLogEntity>,
  ) {}

  /**
   * Create a new activity log entry
   */
  async create(data: Partial<TaskActivityLogEntity>): Promise<TaskActivityLogEntity> {
    const activityLog = this.repository.create(data);
    return this.repository.save(activityLog);
  }

  /**
   * Find activity logs by task ID
   */
  async findByTaskId(taskId: string, limit = 100): Promise<TaskActivityLogEntity[]> {
    return this.repository.find({
      where: { taskId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find activity logs by task ID and activity type
   */
  async findByTaskIdAndType(
    taskId: string,
    activityType: string,
  ): Promise<TaskActivityLogEntity[]> {
    return this.repository.find({
      where: { taskId, activityType },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get recent activities across all tasks (for dashboard/feed)
   */
  async findRecentActivities(limit = 50): Promise<TaskActivityLogEntity[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get activities by user
   */
  async findByUserId(userId: string, limit = 100): Promise<TaskActivityLogEntity[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}

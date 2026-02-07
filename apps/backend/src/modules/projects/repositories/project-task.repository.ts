import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type TaskActivityEntry, TaskStatus } from '@oneohm-epc/shared-types';
import { DataSource, IsNull, type Repository } from 'typeorm';

import { ProjectTaskEntity } from '../entities/project-task.entity';

/**
 * Repository Constants
 * Centralized configuration values for task data access
 */
const REPOSITORY_CONSTANTS = {
  MAX_ACTIVITY_LOG_ENTRIES: 100,
  DEFAULT_KANBAN_ORDER: 1000,
} as const;

/**
 * ProjectTaskRepository
 * Data access layer for project tasks
 */
@Injectable()
export class ProjectTaskRepository {
  constructor(
    @InjectRepository(ProjectTaskEntity)
    private readonly repository: Repository<ProjectTaskEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new project task
   */
  async create(data: Partial<ProjectTaskEntity>): Promise<ProjectTaskEntity> {
    const task = this.repository.create(data);
    return this.repository.save(task);
  }

  /**
   * Find project task by ID
   */
  async findById(id: string, projectId: string): Promise<ProjectTaskEntity | null> {
    return this.repository.findOne({
      where: {
        id,
        projectId,
        deletedAt: IsNull(),
      },
      relations: ['assignee', 'milestone', 'template'],
    });
  }

  /**
   * Find all project tasks with pagination and filters
   */
  async findAll(
    projectId: string,
    page: number,
    limit: number,
    filters: {
      milestoneId?: string;
      assignedToUserId?: string;
      status?: TaskStatus;
      priority?: string;
      search?: string;
    } = {},
  ): Promise<{ data: ProjectTaskEntity[]; total: number }> {
    const skip = (page - 1) * limit;

    // Build where condition
    const where: Record<string, unknown> = {
      projectId,
      deletedAt: IsNull(),
    };

    if (filters.milestoneId) {
      where.milestoneId = filters.milestoneId;
    }
    if (filters.assignedToUserId) {
      where.assignedToUserId = filters.assignedToUserId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.priority) {
      where.priority = filters.priority;
    }

    // Use repository.findAndCount instead of QueryBuilder to avoid databaseName error
    const [data, total] = await this.repository.findAndCount({
      where,
      relations: ['assignee', 'milestone'],
      order: {
        kanbanOrder: 'ASC',
        createdAt: 'DESC',
      },
      skip,
      take: limit,
    });

    return { data, total };
  }

  /**
   * Find tasks by milestone
   */
  async findByMilestone(projectId: string, milestoneId: string): Promise<ProjectTaskEntity[]> {
    return this.repository.find({
      where: {
        projectId,
        milestoneId,
        deletedAt: IsNull(),
      },
      relations: ['assignee'],
      order: {
        kanbanOrder: 'ASC',
      },
    });
  }

  /**
   * Find tasks assigned to user
   */
  async findByAssignee(projectId: string, assignedToUserId: string): Promise<ProjectTaskEntity[]> {
    return this.repository.find({
      where: {
        projectId,
        assignedToUserId,
        deletedAt: IsNull(),
      },
      relations: ['milestone'],
      order: {
        priority: 'DESC',
        startDate: 'ASC',
      },
    });
  }

  /**
   * Update project task
   */
  async update(
    id: string,
    projectId: string,
    data: Record<string, unknown>,
  ): Promise<ProjectTaskEntity | null> {
    await this.repository.update(
      {
        id,
        projectId,
        deletedAt: IsNull(),
      },
      data,
    );
    return this.findById(id, projectId);
  }

  /**
   * Update project task with activity logs in a single transaction
   * Ensures atomicity - if either update or activity log fails, both are rolled back
   *
   * @param id - Task ID
   * @param projectId - Project ID
   * @param data - Update data
   * @param activityEntries - Array of activity log entries to prepend
   * @returns Updated task entity or null if not found
   */
  async updateWithActivityLogs(
    id: string,
    projectId: string,
    data: Record<string, unknown>,
    activityEntries: TaskActivityEntry[],
  ): Promise<ProjectTaskEntity | null> {
    return this.dataSource.transaction(async (manager) => {
      const taskRepo = manager.getRepository(ProjectTaskEntity);

      // Step 1: Update the task
      await taskRepo.update(
        {
          id,
          projectId,
          deletedAt: IsNull(),
        },
        data,
      );

      // Step 2: Prepend all activity log entries (in order)
      if (activityEntries.length > 0) {
        for (const entry of activityEntries) {
          await manager.query(
            `
            UPDATE project_tasks
            SET activity_log = (
              SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
              FROM (
                SELECT elem
                FROM jsonb_array_elements(
                  jsonb_insert(COALESCE(activity_log, '[]'::jsonb), '{0}', $1::jsonb)
                ) WITH ORDINALITY AS t(elem, ord)
                ORDER BY ord
                LIMIT $2
              ) AS limited
            )
            WHERE id = $3 AND project_id = $4 AND deleted_at IS NULL
          `,
            [
              JSON.stringify(entry),
              REPOSITORY_CONSTANTS.MAX_ACTIVITY_LOG_ENTRIES,
              id,
              projectId,
            ],
          );
        }
      }

      // Step 3: Return the updated task
      return taskRepo.findOne({
        where: { id, projectId, deletedAt: IsNull() },
        relations: ['assignee', 'milestone', 'template'],
      });
    });
  }

  /**
   * Soft delete project task
   */
  async softDelete(id: string, projectId: string): Promise<boolean> {
    const result = await this.repository.softDelete({
      id,
      projectId,
    });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Prepend an activity log entry to the task's activityLog JSONB array
   * Automatically trims the array to MAX_ACTIVITY_LOG_ENTRIES to prevent unbounded growth
   *
   * @param id - Task ID
   * @param projectId - Project ID
   * @param entry - The activity entry to prepend
   * @param maxEntries - Maximum entries to keep (defaults to 100)
   */
  async prependActivityLogEntry(
    id: string,
    projectId: string,
    entry: TaskActivityEntry,
    maxEntries: number = REPOSITORY_CONSTANTS.MAX_ACTIVITY_LOG_ENTRIES,
  ): Promise<void> {
    // Use a subquery to:
    // 1. Prepend the new entry to the existing array
    // 2. Limit the result to maxEntries to prevent unbounded growth
    await this.repository
      .createQueryBuilder()
      .update(ProjectTaskEntity)
      .set({
        activityLog: () => `(
          SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
          FROM (
            SELECT elem
            FROM jsonb_array_elements(
              jsonb_insert(COALESCE(activity_log, '[]'::jsonb), '{0}', :entry::jsonb)
            ) WITH ORDINALITY AS t(elem, ord)
            ORDER BY ord
            LIMIT :maxEntries
          ) AS limited
        )`,
      })
      .where('id = :id', { id })
      .andWhere('project_id = :projectId', { projectId })
      .andWhere('deleted_at IS NULL')
      .setParameter('entry', JSON.stringify(entry))
      .setParameter('maxEntries', maxEntries)
      .execute();
  }

  /**
   * Count tasks by status for a project
   */
  async countByStatus(projectId: string): Promise<Record<TaskStatus, number>> {
    const results = await this.repository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(task.id)', 'count')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.deleted_at IS NULL')
      .groupBy('task.status')
      .getRawMany<{ status: TaskStatus; count: string }>();

    const statusCounts: Record<TaskStatus, number> = {
      [TaskStatus.BACKLOG]: 0,
      [TaskStatus.TODO]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.IN_REVIEW]: 0,
      [TaskStatus.TESTING]: 0,
      [TaskStatus.BLOCKED]: 0,
      [TaskStatus.DONE]: 0,
      [TaskStatus.CANCELLED]: 0,
    };

    for (const result of results) {
      statusCounts[result.status] = parseInt(result.count, 10);
    }

    return statusCounts;
  }

  /**
   * Get overdue tasks
   */
  async findOverdue(projectId: string): Promise<ProjectTaskEntity[]> {
    // Use QueryBuilder without joins to avoid databaseName error
    // Then populate relations with a separate query if needed
    return this.repository
      .createQueryBuilder('task')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.deleted_at IS NULL')
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.DONE, TaskStatus.CANCELLED],
      })
      .andWhere('task.end_date < CURRENT_DATE')
      .orderBy('task.end_date', 'ASC')
      .getMany();
  }

  /**
   * Check if code exists for project
   */
  async existsByCode(code: string, projectId: string, excludeId?: string): Promise<boolean> {
    const queryBuilder = this.repository
      .createQueryBuilder('task')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.code = :code', { code })
      .andWhere('task.deleted_at IS NULL');

    if (excludeId) {
      queryBuilder.andWhere('task.id != :excludeId', { excludeId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  /**
   * Get next task code for project
   */
  async getNextTaskCode(projectId: string): Promise<string> {
    const lastTask = await this.repository
      .createQueryBuilder('task')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.code LIKE :pattern', { pattern: 'TASK-%' })
      .orderBy('task.created_at', 'DESC')
      .getOne();

    if (!lastTask) {
      return 'TASK-001';
    }

    const lastNumber = parseInt(lastTask.code.split('-')[1] ?? '0', 10);
    const nextNumber = lastNumber + 1;
    return `TASK-${nextNumber.toString().padStart(3, '0')}`;
  }

  /**
   * Get tasks for Kanban board grouped by status with pagination
   */
  async findForKanban(
    projectId: string,
    status: TaskStatus,
    page: number,
    limit: number,
  ): Promise<{ data: ProjectTaskEntity[]; total: number }> {
    const skip = (page - 1) * limit;

    // Use repository.findAndCount instead of QueryBuilder to avoid databaseName error
    const [data, total] = await this.repository.findAndCount({
      where: {
        projectId,
        status,
        deletedAt: IsNull(),
      },
      relations: ['assignee'],
      order: {
        kanbanOrder: 'ASC',
      },
      skip,
      take: limit,
    });

    return { data, total };
  }

  /**
   * Move task to new status and position atomically
   */
  async moveTask(
    id: string,
    projectId: string,
    newStatus: TaskStatus,
    newKanbanOrder: number,
    expectedVersion: number,
  ): Promise<ProjectTaskEntity | null> {
    // Use optimistic locking
    const result = await this.repository
      .createQueryBuilder()
      .update(ProjectTaskEntity)
      .set({
        status: newStatus,
        kanbanOrder: newKanbanOrder,
        version: () => 'version + 1',
      })
      .where('id = :id', { id })
      .andWhere('project_id = :projectId', { projectId })
      .andWhere('version = :expectedVersion', { expectedVersion })
      .andWhere('deleted_at IS NULL')
      .execute();

    if (result.affected === 0) {
      return null; // Version mismatch or not found
    }

    return this.findById(id, projectId);
  }

  /**
   * Move task to new status/position with activity logging in a single transaction
   * Ensures atomicity - both move and activity log are committed together
   *
   * @param id - Task ID
   * @param projectId - Project ID
   * @param newStatus - New task status
   * @param newKanbanOrder - New kanban order position
   * @param expectedVersion - Expected version for optimistic locking
   * @param activityEntry - Activity log entry to record (if status changed)
   * @returns Updated task entity or null if version mismatch
   */
  async moveTaskWithActivityLog(
    id: string,
    projectId: string,
    newStatus: TaskStatus,
    newKanbanOrder: number,
    expectedVersion: number,
    activityEntry?: TaskActivityEntry,
  ): Promise<ProjectTaskEntity | null> {
    return this.dataSource.transaction(async (manager) => {
      // Step 1: Move task with optimistic locking
      const result = await manager
        .createQueryBuilder()
        .update(ProjectTaskEntity)
        .set({
          status: newStatus,
          kanbanOrder: newKanbanOrder,
          version: () => 'version + 1',
        })
        .where('id = :id', { id })
        .andWhere('project_id = :projectId', { projectId })
        .andWhere('version = :expectedVersion', { expectedVersion })
        .andWhere('deleted_at IS NULL')
        .execute();

      if (result.affected === 0) {
        return null; // Version mismatch or not found
      }

      // Step 2: Prepend activity log entry if provided
      if (activityEntry) {
        await manager.query(
          `
          UPDATE project_tasks
          SET activity_log = (
            SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
            FROM (
              SELECT elem
              FROM jsonb_array_elements(
                jsonb_insert(COALESCE(activity_log, '[]'::jsonb), '{0}', $1::jsonb)
              ) WITH ORDINALITY AS t(elem, ord)
              ORDER BY ord
              LIMIT $2
            ) AS limited
          )
          WHERE id = $3 AND project_id = $4 AND deleted_at IS NULL
        `,
          [
            JSON.stringify(activityEntry),
            REPOSITORY_CONSTANTS.MAX_ACTIVITY_LOG_ENTRIES,
            id,
            projectId,
          ],
        );
      }

      // Step 3: Return updated task
      return manager.findOne(ProjectTaskEntity, {
        where: { id, projectId, deletedAt: IsNull() },
        relations: ['assignee', 'milestone', 'template'],
      });
    });
  }

  /**
   * Find tasks by user ID across all projects
   */
  async findByUserId(
    userId: string,
    page: number,
    limit: number,
    filters: {
      status?: TaskStatus;
      priority?: string;
    } = {},
  ): Promise<{ data: ProjectTaskEntity[]; total: number }> {
    const skip = (page - 1) * limit;

    // Build where condition
    const where: Record<string, unknown> = {
      assignedToUserId: userId,
      deletedAt: IsNull(),
    };

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.priority) {
      where.priority = filters.priority;
    }

    // Use repository.findAndCount instead of QueryBuilder to avoid databaseName error
    const [data, total] = await this.repository.findAndCount({
      where,
      relations: ['project', 'milestone'],
      order: {
        priority: 'DESC',
        endDate: 'ASC',
      },
      skip,
      take: limit,
    });

    return { data, total };
  }

  /**
   * Check if all dependencies are complete
   */
  async areAllDependenciesComplete(dependsOnTaskIds: string[]): Promise<boolean> {
    if (!dependsOnTaskIds || dependsOnTaskIds.length === 0) {
      return true;
    }

    const incompleteTasks = await this.repository
      .createQueryBuilder('task')
      .where('task.id IN (:...taskIds)', { taskIds: dependsOnTaskIds })
      .andWhere('task.status != :doneStatus', { doneStatus: TaskStatus.DONE })
      .andWhere('task.deleted_at IS NULL')
      .getCount();

    return incompleteTasks === 0;
  }

  /**
   * Find tasks with upcoming deadlines
   */
  async findUpcomingDeadlines(projectId: string, daysAhead: number): Promise<ProjectTaskEntity[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.repository
      .createQueryBuilder('task')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.deleted_at IS NULL')
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.DONE, TaskStatus.CANCELLED],
      })
      .andWhere('task.end_date IS NOT NULL')
      .andWhere('task.end_date <= :futureDate', { futureDate })
      .andWhere('task.end_date >= CURRENT_DATE')
      .orderBy('task.end_date', 'ASC')
      .getMany();
  }
}

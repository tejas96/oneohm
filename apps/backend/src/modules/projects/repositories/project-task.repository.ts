import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TaskStatus } from '@oneohm-epc/shared-types';
import { IsNull, type Repository } from 'typeorm';

import { ProjectTaskEntity } from '../entities/project-task.entity';

/**
 * ProjectTaskRepository
 * Data access layer for project tasks
 */
@Injectable()
export class ProjectTaskRepository {
  constructor(
    @InjectRepository(ProjectTaskEntity)
    private readonly repository: Repository<ProjectTaskEntity>,
  ) {}

  /**
   * Create a new project task
   */
  async create(data: Partial<ProjectTaskEntity>): Promise<ProjectTaskEntity> {
    const task = this.repository.create(data);
    return await this.repository.save(task);
  }

  /**
   * Find project task by ID
   */
  async findById(id: string, projectId: string): Promise<ProjectTaskEntity | null> {
    return await this.repository.findOne({
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
    const queryBuilder = this.repository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.milestone', 'milestone')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.deleted_at IS NULL');

    if (filters.milestoneId) {
      queryBuilder.andWhere('task.milestone_id = :milestoneId', { milestoneId: filters.milestoneId });
    }

    if (filters.assignedToUserId) {
      queryBuilder.andWhere('task.assigned_to_user_id = :assignedToUserId', {
        assignedToUserId: filters.assignedToUserId,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('task.status = :status', { status: filters.status });
    }

    if (filters.priority) {
      queryBuilder.andWhere('task.priority = :priority', { priority: filters.priority });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(LOWER(task.name) LIKE LOWER(:search) OR LOWER(task.code) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    queryBuilder
      .orderBy('task.sequence_order', 'ASC')
      .addOrderBy('task.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  /**
   * Find tasks by milestone
   */
  async findByMilestone(projectId: string, milestoneId: string): Promise<ProjectTaskEntity[]> {
    return await this.repository.find({
      where: {
        projectId,
        milestoneId,
        deletedAt: IsNull(),
      },
      relations: ['assignee'],
      order: {
        sequenceOrder: 'ASC',
      },
    });
  }

  /**
   * Find tasks assigned to user
   */
  async findByAssignee(projectId: string, assignedToUserId: string): Promise<ProjectTaskEntity[]> {
    return await this.repository.find({
      where: {
        projectId,
        assignedToUserId,
        deletedAt: IsNull(),
      },
      relations: ['milestone'],
      order: {
        priority: 'DESC',
        plannedStartDate: 'ASC',
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
    return await this.findById(id, projectId);
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
      [TaskStatus.PENDING]: 0,
      [TaskStatus.TODO]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.IN_REVIEW]: 0,
      [TaskStatus.BLOCKED]: 0,
      [TaskStatus.COMPLETED]: 0,
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
    return await this.repository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.milestone', 'milestone')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.deleted_at IS NULL')
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      })
      .andWhere('task.planned_end_date < CURRENT_DATE')
      .orderBy('task.planned_end_date', 'ASC')
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
}


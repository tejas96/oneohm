import { randomUUID } from 'crypto';

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  type PaginatedResponse,
  type StatisticsResponse,
  type TaskActivityEntry,
  type TaskActivityType,
  TaskStatus,
} from '@oneohm-epc/shared-types';

import { generateEntityCode } from '../../../common/utils/code-generator.util';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { type CreateProjectTaskDto, type UpdateProjectTaskDto } from '../dto';
import { type ProjectTaskEntity } from '../entities';
import { ProjectTaskRepository } from '../repositories';
import { ProjectTeamRepository } from '../repositories/project-team.repository';

/**
 * Service Constants
 * Centralized configuration values for task service operations
 */
const SERVICE_CONSTANTS = {
  DEFAULT_ACTIVITY_LOG_LIMIT: 100,
} as const;

/**
 * ProjectTaskService
 * Business logic for project tasks with embedded activity logging
 */
@Injectable()
export class ProjectTaskService {
  private readonly logger = new Logger(ProjectTaskService.name);

  constructor(
    private readonly taskRepository: ProjectTaskRepository,
    private readonly teamRepository: ProjectTeamRepository,
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  /**
   * Create a new project task
   */
  async create(createDto: CreateProjectTaskDto, currentUserId: string): Promise<ProjectTaskEntity> {
    // projectId is set from route param by controller, validate it exists
    if (!createDto.projectId) {
      throw new BadRequestException('Project ID is required');
    }
    const projectId = createDto.projectId;

    // Check if code already exists
    const codeExists = await this.taskRepository.existsByCode(createDto.code, projectId);
    if (codeExists) {
      throw new BadRequestException(
        `Task with code ${createDto.code} already exists in this project`,
      );
    }

    // Validate dependencies
    if (createDto.dependsOnTaskIds && createDto.dependsOnTaskIds.length > 0) {
      for (const depId of createDto.dependsOnTaskIds) {
        const dependencyTask = await this.taskRepository.findById(depId, projectId);
        if (!dependencyTask) {
          throw new BadRequestException(`Dependency task with ID ${depId} not found`);
        }
      }
    }

    return this.taskRepository.create({
      ...createDto,
      projectId,
      createdBy: currentUserId,
      updatedBy: currentUserId,
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
  ): Promise<PaginatedResponse<ProjectTaskEntity>> {
    const { data, total } = await this.taskRepository.findAll(projectId, page, limit, filters);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find project task by ID
   */
  async findById(id: string, projectId: string): Promise<ProjectTaskEntity> {
    const task = await this.taskRepository.findById(id, projectId);
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return task;
  }

  /**
   * Find tasks by milestone
   */
  async findByMilestone(projectId: string, milestoneId: string): Promise<ProjectTaskEntity[]> {
    return this.taskRepository.findByMilestone(projectId, milestoneId);
  }

  /**
   * Find tasks assigned to user
   */
  async findByAssignee(projectId: string, assignedToUserId: string): Promise<ProjectTaskEntity[]> {
    return this.taskRepository.findByAssignee(projectId, assignedToUserId);
  }

  /**
   * Update project task with activity logging in a single transaction
   * Ensures atomicity - if update or activity log fails, both are rolled back
   */
  async update(
    id: string,
    projectId: string,
    updateDto: UpdateProjectTaskDto,
    currentUserId: string,
  ): Promise<ProjectTaskEntity> {
    // Check if task exists and get current state for activity logging
    const existingTask = await this.findById(id, projectId);

    // Check if code is being updated and already exists
    if (updateDto.code) {
      const codeExists = await this.taskRepository.existsByCode(updateDto.code, projectId, id);
      if (codeExists) {
        throw new BadRequestException(
          `Task with code ${updateDto.code} already exists in this project`,
        );
      }
    }

    // Validate dependencies
    if (updateDto.dependsOnTaskIds && updateDto.dependsOnTaskIds.length > 0) {
      for (const depId of updateDto.dependsOnTaskIds) {
        const dependencyTask = await this.taskRepository.findById(depId, projectId);
        if (!dependencyTask) {
          throw new BadRequestException(`Dependency task with ID ${depId} not found`);
        }
      }
    }

    // Auto-set dates based on status
    const statusChanges: Record<string, unknown> = {};
    if (updateDto.status === TaskStatus.IN_PROGRESS) {
      if (!existingTask.startDate) {
        statusChanges.startDate = new Date();
      }
    }
    if (updateDto.status === TaskStatus.DONE || updateDto.status === TaskStatus.CANCELLED) {
      if (!existingTask.endDate) {
        statusChanges.endDate = new Date();
      }
      if (updateDto.status === TaskStatus.DONE) {
        statusChanges.completionPercentage = 100;
      }
    }

    // Build activity log entries based on changes
    const activityEntries: TaskActivityEntry[] = this.buildActivityEntries(
      existingTask,
      updateDto,
      currentUserId,
    );

    // Perform update with activity logs in a single transaction
    const updated = await this.taskRepository.updateWithActivityLogs(
      id,
      projectId,
      {
        ...updateDto,
        ...statusChanges,
        updatedBy: currentUserId,
      },
      activityEntries,
    );

    if (!updated) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return updated;
  }

  /**
   * Build activity log entries based on changes between existing task and update DTO
   * @private
   */
  private buildActivityEntries(
    existingTask: ProjectTaskEntity,
    updateDto: UpdateProjectTaskDto,
    currentUserId: string,
  ): TaskActivityEntry[] {
    const entries: TaskActivityEntry[] = [];
    const now = new Date().toISOString();

    // Log status changes
    if (updateDto.status && updateDto.status !== existingTask.status) {
      entries.push({
        id: randomUUID(),
        activityType: 'status_changed',
        userId: currentUserId,
        fieldName: 'status',
        oldValue: existingTask.status,
        newValue: updateDto.status,
        createdAt: now,
      });
    }

    // Log assignment changes
    if (updateDto.assignedToUserId && updateDto.assignedToUserId !== existingTask.assignedToUserId) {
      entries.push({
        id: randomUUID(),
        activityType: 'assigned',
        userId: currentUserId,
        fieldName: 'assignedToUserId',
        oldValue: existingTask.assignedToUserId,
        newValue: updateDto.assignedToUserId,
        createdAt: now,
      });
    }

    // Log priority changes
    if (updateDto.priority && updateDto.priority !== existingTask.priority) {
      entries.push({
        id: randomUUID(),
        activityType: 'priority_changed',
        userId: currentUserId,
        fieldName: 'priority',
        oldValue: existingTask.priority,
        newValue: updateDto.priority,
        createdAt: now,
      });
    }

    // Log general update if no specific field changes tracked
    if (entries.length === 0) {
      entries.push({
        id: randomUUID(),
        activityType: 'updated',
        userId: currentUserId,
        createdAt: now,
      });
    }

    return entries;
  }

  /**
   * Update task status
   */
  async updateStatus(
    id: string,
    projectId: string,
    status: TaskStatus,
    currentUserId: string,
  ): Promise<ProjectTaskEntity> {
    return this.update(id, projectId, { status }, currentUserId);
  }

  /**
   * Assign task to user (validates user is a project team member)
   */
  async assignTask(
    id: string,
    projectId: string,
    assignedToUserId: string,
    currentUserId: string,
  ): Promise<ProjectTaskEntity> {
    const isMember = await this.teamRepository.isTeamMember(assignedToUserId, projectId);
    if (!isMember) {
      throw new BadRequestException(
        'Cannot assign task: user is not a team member of this project',
      );
    }
    return this.update(id, projectId, { assignedToUserId }, currentUserId);
  }

  /**
   * Update task progress
   */
  async updateProgress(
    id: string,
    projectId: string,
    completionPercentage: number,
    currentUserId: string,
  ): Promise<ProjectTaskEntity> {
    if (completionPercentage < 0 || completionPercentage > 100) {
      throw new BadRequestException('Completion percentage must be between 0 and 100');
    }

    const statusUpdate: { completionPercentage: number; status?: TaskStatus } = {
      completionPercentage,
    };

    if (completionPercentage === 100) {
      statusUpdate.status = TaskStatus.DONE;
    }

    return this.update(id, projectId, statusUpdate, currentUserId);
  }

  /**
   * Get activity log for a task
   * @param taskId - Task ID
   * @param projectId - Project ID
   * @param limit - Maximum number of entries to return (defaults to 100)
   */
  async getTaskActivityLog(
    taskId: string,
    projectId: string,
    limit: number = SERVICE_CONSTANTS.DEFAULT_ACTIVITY_LOG_LIMIT,
  ): Promise<TaskActivityEntry[]> {
    const task = await this.findById(taskId, projectId);
    return (task.activityLog || []).slice(0, limit);
  }

  /**
   * Delete project task
   */
  async remove(id: string, projectId: string): Promise<void> {
    await this.findById(id, projectId);

    const deleted = await this.taskRepository.softDelete(id, projectId);
    if (!deleted) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
  }

  /**
   * Get task statistics for project
   */
  async getStatistics(projectId: string): Promise<StatisticsResponse<TaskStatus>> {
    const byStatus = await this.taskRepository.countByStatus(projectId);
    const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

    return {
      total,
      byStatus,
    };
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(projectId: string): Promise<ProjectTaskEntity[]> {
    return this.taskRepository.findOverdue(projectId);
  }

  /**
   * Generate next task code using global format TSK-{ORG}-{YEAR}-{SEQ}
   */
  async generateTaskCode(_projectId: string, organizationId?: string): Promise<string> {
    if (organizationId) {
      try {
        const org = await this.organizationRepository.findOneById(organizationId);
        if (org) {
          return generateEntityCode(
            this.taskRepository.repository,
            'code',
            'TSK',
            org.code,
          );
        }
      } catch (err) {
        this.logger.warn(`Failed to generate global task code, falling back: ${String(err)}`);
      }
    }
    return this.taskRepository.getNextTaskCode(_projectId);
  }

  /**
   * Get tasks for Kanban board by status with pagination
   */
  async getKanbanColumn(
    projectId: string,
    status: TaskStatus,
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<ProjectTaskEntity>> {
    const { data, total } = await this.taskRepository.findForKanban(projectId, status, page, limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Move task to new status/position (Kanban drag-drop)
   * Uses optimistic locking and transactions for atomicity
   */
  async moveTask(
    id: string,
    projectId: string,
    newStatus: TaskStatus,
    newKanbanOrder: number,
    expectedVersion: number,
    currentUserId: string,
  ): Promise<ProjectTaskEntity> {
    const existingTask = await this.findById(id, projectId);

    // Check dependencies if moving to IN_PROGRESS
    if (newStatus === TaskStatus.IN_PROGRESS && existingTask.dependsOnTaskIds?.length) {
      const depsComplete = await this.taskRepository.areAllDependenciesComplete(
        existingTask.dependsOnTaskIds,
      );
      if (!depsComplete) {
        throw new BadRequestException(
          'Cannot start task: some dependencies are not yet complete',
        );
      }
    }

    // Build activity entry if status changed
    const activityEntry: TaskActivityEntry | undefined =
      newStatus !== existingTask.status
        ? {
            id: randomUUID(),
            activityType: 'status_changed',
            userId: currentUserId,
            fieldName: 'status',
            oldValue: existingTask.status,
            newValue: newStatus,
            createdAt: new Date().toISOString(),
          }
        : undefined;

    // Perform move with activity log in a single transaction
    const updated = await this.taskRepository.moveTaskWithActivityLog(
      id,
      projectId,
      newStatus,
      newKanbanOrder,
      expectedVersion,
      activityEntry,
    );

    if (!updated) {
      throw new BadRequestException(
        'Task was modified by another user. Please refresh and try again.',
      );
    }

    return updated;
  }

  /**
   * Get all tasks assigned to a user across all projects (My Tasks)
   */
  async getMyTasks(
    userId: string,
    page: number,
    limit: number,
    filters: {
      status?: TaskStatus;
      priority?: string;
    } = {},
  ): Promise<PaginatedResponse<ProjectTaskEntity>> {
    const { data, total } = await this.taskRepository.findByUserId(userId, page, limit, filters);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create activity log entry (private helper)
   * Prepends a new entry to the task's activityLog JSONB array
   *
   * @param taskId - Task ID
   * @param projectId - Project ID
   * @param activityType - Type of activity (type-safe)
   * @param userId - ID of user who performed the action
   * @param fieldName - Name of field that changed (optional)
   * @param oldValue - Previous value (optional)
   * @param newValue - New value (optional)
   */
  private async createActivityLog(
    taskId: string,
    projectId: string,
    activityType: TaskActivityType,
    userId: string,
    fieldName?: string,
    oldValue?: string,
    newValue?: string,
  ): Promise<void> {
    const newEntry: TaskActivityEntry = {
      id: randomUUID(),
      activityType,
      userId,
      fieldName,
      oldValue,
      newValue,
      createdAt: new Date().toISOString(),
    };

    // Prepend the new entry to the activity log array (automatically capped at 100 entries)
    await this.taskRepository.prependActivityLogEntry(taskId, projectId, newEntry);
  }
}

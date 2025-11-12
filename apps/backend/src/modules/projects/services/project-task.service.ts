import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type PaginatedResponse,
  type StatisticsResponse,
  TaskStatus,
} from '@oneohm-epc/shared-types';

import { type CreateProjectTaskDto, type UpdateProjectTaskDto } from '../dto';
import { type ProjectTaskEntity } from '../entities';
import { ProjectTaskRepository } from '../repositories';

/**
 * ProjectTaskService
 * Business logic for project tasks
 */
@Injectable()
export class ProjectTaskService {
  constructor(private readonly taskRepository: ProjectTaskRepository) {}

  /**
   * Create a new project task
   */
  async create(createDto: CreateProjectTaskDto, currentUserId: string): Promise<ProjectTaskEntity> {
    // Check if code already exists
    const codeExists = await this.taskRepository.existsByCode(createDto.code, createDto.projectId);
    if (codeExists) {
      throw new BadRequestException(`Task with code ${createDto.code} already exists in this project`);
    }

    // Validate dependencies
    if (createDto.dependsOnTaskIds && createDto.dependsOnTaskIds.length > 0) {
      for (const depId of createDto.dependsOnTaskIds) {
        const dependencyTask = await this.taskRepository.findById(depId, createDto.projectId);
        if (!dependencyTask) {
          throw new BadRequestException(`Dependency task with ID ${depId} not found`);
        }
      }
    }

    return this.taskRepository.create({
      ...createDto,
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
   * Update project task
   */
  async update(
    id: string,
    projectId: string,
    updateDto: UpdateProjectTaskDto,
    currentUserId: string,
  ): Promise<ProjectTaskEntity> {
    // Check if task exists
    await this.findById(id, projectId);

    // Check if code is being updated and already exists
    if (updateDto.code) {
      const codeExists = await this.taskRepository.existsByCode(updateDto.code, projectId, id);
      if (codeExists) {
        throw new BadRequestException(`Task with code ${updateDto.code} already exists in this project`);
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
      const existingTask = await this.findById(id, projectId);
      if (!existingTask.actualStartDate) {
        statusChanges.actualStartDate = new Date();
      }
    }
    if (
      updateDto.status === TaskStatus.COMPLETED || updateDto.status === TaskStatus.CANCELLED
    ) {
      const existingTask = await this.findById(id, projectId);
      if (!existingTask.actualEndDate) {
        statusChanges.actualEndDate = new Date();
      }
      if (updateDto.status === TaskStatus.COMPLETED) {
        statusChanges.completionPercentage = 100;
      }
    }

    const updated = await this.taskRepository.update(id, projectId, {
      ...updateDto,
      ...statusChanges,
      updatedBy: currentUserId,
    });

    if (!updated) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return updated;
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
   * Assign task to user
   */
  async assignTask(
    id: string,
    projectId: string,
    assignedToUserId: string,
    currentUserId: string,
  ): Promise<ProjectTaskEntity> {
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
      statusUpdate.status = TaskStatus.COMPLETED;
    }

    return this.update(id, projectId, statusUpdate, currentUserId);
  }

  /**
   * Log time for task
   */
  async logTime(
    id: string,
    projectId: string,
    hoursToAdd: number,
    currentUserId: string,
  ): Promise<ProjectTaskEntity> {
    const task = await this.findById(id, projectId);

    if (hoursToAdd < 0) {
      throw new BadRequestException('Hours to add must be positive');
    }

    const newLoggedHours = task.loggedHours + hoursToAdd;

    const updated = await this.taskRepository.update(id, projectId, {
      loggedHours: newLoggedHours,
      updatedBy: currentUserId,
    });

    if (!updated) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return updated;
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
   * Generate next task code
   */
  async generateTaskCode(projectId: string): Promise<string> {
    return this.taskRepository.getNextTaskCode(projectId);
  }
}


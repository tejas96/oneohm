import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { MaintenanceTaskStatus } from '@tejas96/shared/types';
import { plainToInstance } from 'class-transformer';

import {
  CreateMaintenanceTaskDto,
  UpdateMaintenanceTaskDto,
  MaintenanceTaskResponseDto,
} from '../dto';
import { MaintenanceTaskEntity } from '../entities/maintenance-task.entity';
import { MaintenanceTaskRepository } from '../repositories/maintenance-task.repository';

/**
 * Service for Maintenance Task Operations
 */
@Injectable()
export class MaintenanceTaskService {
  constructor(private readonly maintenanceTaskRepository: MaintenanceTaskRepository) {}

  /**
   * Create a new maintenance task
   */
  async create(createDto: CreateMaintenanceTaskDto): Promise<MaintenanceTaskResponseDto> {
    const task = await this.maintenanceTaskRepository.create({
      ...createDto,
      scheduledDate: new Date(createDto.scheduledDate),
      completedDate: createDto.completedDate ? new Date(createDto.completedDate) : null,
      assignedAt: createDto.assignedToUserId ? new Date() : null,
    });

    return plainToInstance(MaintenanceTaskResponseDto, task, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Find all maintenance tasks
   */
  async findAll(includeRelations: boolean = false): Promise<MaintenanceTaskResponseDto[]> {
    const relations = includeRelations
      ? [
          'organization',
          'project',
          'maintenanceConfig',
          'assignedToUser',
          'createdByUser',
          'updatedByUser',
        ]
      : [];
    const tasks = await this.maintenanceTaskRepository.findAll({ relations });

    return tasks.map((task) =>
      plainToInstance(MaintenanceTaskResponseDto, task, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Find task by ID
   */
  async findById(
    id: string,
    includeRelations: boolean = false,
  ): Promise<MaintenanceTaskResponseDto> {
    const relations = includeRelations
      ? [
          'organization',
          'project',
          'maintenanceConfig',
          'assignedToUser',
          'createdByUser',
          'updatedByUser',
        ]
      : [];
    const task = await this.maintenanceTaskRepository.findById(id, { relations });

    if (!task) {
      throw new NotFoundException(`Maintenance task with ID ${id} not found`);
    }

    return plainToInstance(MaintenanceTaskResponseDto, task, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Find tasks by project
   */
  async findByProject(
    projectId: string,
    includeRelations: boolean = false,
  ): Promise<MaintenanceTaskResponseDto[]> {
    const relations = includeRelations
      ? ['organization', 'maintenanceConfig', 'assignedToUser']
      : [];
    const tasks = await this.maintenanceTaskRepository.findByProject(projectId, { relations });

    return tasks.map((task) =>
      plainToInstance(MaintenanceTaskResponseDto, task, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Find tasks by assigned user
   */
  async findByAssignedUser(
    userId: string,
    includeRelations: boolean = false,
  ): Promise<MaintenanceTaskResponseDto[]> {
    const relations = includeRelations ? ['organization', 'project', 'maintenanceConfig'] : [];
    const tasks = await this.maintenanceTaskRepository.findByAssignedUser(userId, { relations });

    return tasks.map((task) =>
      plainToInstance(MaintenanceTaskResponseDto, task, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Find tasks by status
   */
  async findByStatus(
    status: MaintenanceTaskStatus,
    includeRelations: boolean = false,
  ): Promise<MaintenanceTaskResponseDto[]> {
    const relations = includeRelations
      ? ['organization', 'project', 'maintenanceConfig', 'assignedToUser']
      : [];
    const tasks = await this.maintenanceTaskRepository.findByStatus(status, { relations });

    return tasks.map((task) =>
      plainToInstance(MaintenanceTaskResponseDto, task, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Find overdue tasks
   */
  async findOverdue(includeRelations: boolean = false): Promise<MaintenanceTaskResponseDto[]> {
    const relations = includeRelations
      ? ['organization', 'project', 'maintenanceConfig', 'assignedToUser']
      : [];
    const tasks = await this.maintenanceTaskRepository.findOverdue({ relations });

    return tasks.map((task) =>
      plainToInstance(MaintenanceTaskResponseDto, task, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Find upcoming tasks
   */
  async findUpcoming(
    days: number = 7,
    includeRelations: boolean = false,
  ): Promise<MaintenanceTaskResponseDto[]> {
    const relations = includeRelations
      ? ['organization', 'project', 'maintenanceConfig', 'assignedToUser']
      : [];
    const tasks = await this.maintenanceTaskRepository.findUpcoming(days, { relations });

    return tasks.map((task) =>
      plainToInstance(MaintenanceTaskResponseDto, task, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Assign task to user
   */
  async assignTask(
    id: string,
    assignedToUserId: string,
    assignedToDepartment?: string,
  ): Promise<MaintenanceTaskResponseDto> {
    const existing = await this.maintenanceTaskRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Maintenance task with ID ${id} not found`);
    }

    const updated = await this.maintenanceTaskRepository.update(id, {
      assignedToUserId,
      assignedToDepartment: assignedToDepartment || existing.assignedToDepartment,
      assignedAt: new Date(),
      status: MaintenanceTaskStatus.ASSIGNED,
    });

    if (!updated) {
      throw new BadRequestException(`Failed to assign task ${id}`);
    }

    return plainToInstance(MaintenanceTaskResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update task
   */
  async update(
    id: string,
    updateDto: UpdateMaintenanceTaskDto,
  ): Promise<MaintenanceTaskResponseDto> {
    const existing = await this.maintenanceTaskRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Maintenance task with ID ${id} not found`);
    }

    const updateData: Partial<MaintenanceTaskEntity> = {
      ...updateDto,
      scheduledDate: updateDto.scheduledDate ? new Date(updateDto.scheduledDate) : undefined,
      completedDate: updateDto.completedDate ? new Date(updateDto.completedDate) : undefined,
    };

    const updated = await this.maintenanceTaskRepository.update(id, updateData);

    if (!updated) {
      throw new NotFoundException(`Failed to update maintenance task ${id}`);
    }

    return plainToInstance(MaintenanceTaskResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Complete task
   */
  async completeTask(id: string): Promise<MaintenanceTaskResponseDto> {
    const existing = await this.maintenanceTaskRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Maintenance task with ID ${id} not found`);
    }

    const updated = await this.maintenanceTaskRepository.update(id, {
      status: MaintenanceTaskStatus.COMPLETED,
      completedDate: new Date(),
    });

    if (!updated) {
      throw new BadRequestException(`Failed to complete task ${id}`);
    }

    return plainToInstance(MaintenanceTaskResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Delete task
   */
  async delete(id: string): Promise<void> {
    const existing = await this.maintenanceTaskRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Maintenance task with ID ${id} not found`);
    }

    const deleted = await this.maintenanceTaskRepository.delete(id);
    if (!deleted) {
      throw new BadRequestException(`Failed to delete maintenance task ${id}`);
    }
  }

  /**
   * Get statistics for organization
   */
  async getStatistics(organizationId: string): Promise<Record<string, unknown>> {
    const [stats, overdueCount] = await Promise.all([
      this.maintenanceTaskRepository.getStatsByOrganization(organizationId),
      this.maintenanceTaskRepository.countOverdue(),
    ]);

    return {
      ...stats,
      overdue: overdueCount,
    };
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { ProjectMaintenanceConfigEntity } from '../entities/project-maintenance-config.entity';
import {
  CreateMaintenanceConfigDto,
  UpdateMaintenanceConfigDto,
  MaintenanceConfigResponseDto,
} from '../dto';
import { ProjectMaintenanceConfigRepository } from '../repositories/project-maintenance-config.repository';

/**
 * Service for Project Maintenance Config Operations
 */
@Injectable()
export class ProjectMaintenanceConfigService {
  constructor(
    private readonly maintenanceConfigRepository: ProjectMaintenanceConfigRepository,
  ) {}

  /**
   * Create a new maintenance config
   */
  async create(createDto: CreateMaintenanceConfigDto): Promise<MaintenanceConfigResponseDto> {
    // Check if config already exists for project
    const existing = await this.maintenanceConfigRepository.findByProjectId(createDto.projectId);
    if (existing) {
      throw new BadRequestException(
        `Maintenance config already exists for project ${createDto.projectId}`,
      );
    }

    const config = await this.maintenanceConfigRepository.create({
      ...createDto,
      projectCompletionDate: createDto.projectCompletionDate
        ? new Date(createDto.projectCompletionDate)
        : null,
      lastMaintenanceDate: createDto.lastMaintenanceDate ? new Date(createDto.lastMaintenanceDate) : null,
      nextMaintenanceDueDate: createDto.nextMaintenanceDueDate
        ? new Date(createDto.nextMaintenanceDueDate)
        : null,
    });

    return plainToInstance(MaintenanceConfigResponseDto, config, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Find all maintenance configs
   */
  async findAll(includeRelations: boolean = false): Promise<MaintenanceConfigResponseDto[]> {
    const relations = includeRelations
      ? ['organization', 'project', 'createdByUser', 'updatedByUser']
      : [];
    const configs = await this.maintenanceConfigRepository.findAll({ relations });

    return configs.map((config) =>
      plainToInstance(MaintenanceConfigResponseDto, config, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Find config by ID
   */
  async findById(id: string, includeRelations: boolean = false): Promise<MaintenanceConfigResponseDto> {
    const relations = includeRelations
      ? ['organization', 'project', 'createdByUser', 'updatedByUser']
      : [];
    const config = await this.maintenanceConfigRepository.findById(id, { relations });

    if (!config) {
      throw new NotFoundException(`Maintenance config with ID ${id} not found`);
    }

    return plainToInstance(MaintenanceConfigResponseDto, config, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Find config by project ID
   */
  async findByProjectId(
    projectId: string,
    includeRelations: boolean = false,
  ): Promise<MaintenanceConfigResponseDto> {
    const relations = includeRelations
      ? ['organization', 'project', 'createdByUser', 'updatedByUser']
      : [];
    const config = await this.maintenanceConfigRepository.findByProjectId(projectId, { relations });

    if (!config) {
      throw new NotFoundException(`Maintenance config for project ${projectId} not found`);
    }

    return plainToInstance(MaintenanceConfigResponseDto, config, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Find configs by organization
   */
  async findByOrganization(
    organizationId: string,
    includeRelations: boolean = false,
  ): Promise<MaintenanceConfigResponseDto[]> {
    const relations = includeRelations
      ? ['organization', 'project', 'createdByUser', 'updatedByUser']
      : [];
    const configs = await this.maintenanceConfigRepository.findByOrganization(organizationId, {
      relations,
    });

    return configs.map((config) =>
      plainToInstance(MaintenanceConfigResponseDto, config, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Find active configs
   */
  async findActive(includeRelations: boolean = false): Promise<MaintenanceConfigResponseDto[]> {
    const relations = includeRelations
      ? ['organization', 'project', 'createdByUser', 'updatedByUser']
      : [];
    const configs = await this.maintenanceConfigRepository.findActive({ relations });

    return configs.map((config) =>
      plainToInstance(MaintenanceConfigResponseDto, config, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Find configs with upcoming maintenance
   */
  async findUpcomingMaintenance(
    date?: Date,
    includeRelations: boolean = false,
  ): Promise<MaintenanceConfigResponseDto[]> {
    const relations = includeRelations
      ? ['organization', 'project', 'createdByUser', 'updatedByUser']
      : [];
    const configs = await this.maintenanceConfigRepository.findUpcomingMaintenance(date, {
      relations,
    });

    return configs.map((config) =>
      plainToInstance(MaintenanceConfigResponseDto, config, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Update maintenance config
   */
  async update(
    id: string,
    updateDto: UpdateMaintenanceConfigDto,
  ): Promise<MaintenanceConfigResponseDto> {
    const existing = await this.maintenanceConfigRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Maintenance config with ID ${id} not found`);
    }

    const updateData: Partial<ProjectMaintenanceConfigEntity> = {
      ...updateDto,
      projectCompletionDate: updateDto.projectCompletionDate
        ? new Date(updateDto.projectCompletionDate)
        : undefined,
      lastMaintenanceDate: updateDto.lastMaintenanceDate
        ? new Date(updateDto.lastMaintenanceDate)
        : undefined,
      nextMaintenanceDueDate: updateDto.nextMaintenanceDueDate
        ? new Date(updateDto.nextMaintenanceDueDate)
        : undefined,
    };

    const updated = await this.maintenanceConfigRepository.update(id, updateData);

    if (!updated) {
      throw new NotFoundException(`Failed to update maintenance config ${id}`);
    }

    return plainToInstance(MaintenanceConfigResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Delete maintenance config
   */
  async delete(id: string): Promise<void> {
    const existing = await this.maintenanceConfigRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Maintenance config with ID ${id} not found`);
    }

    const deleted = await this.maintenanceConfigRepository.delete(id);
    if (!deleted) {
      throw new BadRequestException(`Failed to delete maintenance config ${id}`);
    }
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<Record<string, number>> {
    const [active, overdue] = await Promise.all([
      this.maintenanceConfigRepository.countActive(),
      this.maintenanceConfigRepository.countOverdue(),
    ]);

    return {
      active,
      overdue,
    };
  }
}


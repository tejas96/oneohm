import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type PaginatedResponse, type StatisticsResponse } from '@oneohm-epc/shared-types';

import { type CreateTaskTemplateDto, type UpdateTaskTemplateDto } from '../dto';
import { type TaskTemplateEntity } from '../entities';
import { TaskTemplateRepository } from '../repositories';

/**
 * TaskTemplateService
 * Business logic for task templates
 */
@Injectable()
export class TaskTemplateService {
  constructor(private readonly templateRepository: TaskTemplateRepository) {}

  /**
   * Create a new task template
   */
  async create(
    createDto: CreateTaskTemplateDto,
    currentUserId: string,
  ): Promise<TaskTemplateEntity> {
    // Check if code already exists
    const codeExists = await this.templateRepository.existsByCode(
      createDto.code,
      createDto.organizationId,
    );
    if (codeExists) {
      throw new BadRequestException(`Task template with code ${createDto.code} already exists`);
    }

    return this.templateRepository.create({
      ...createDto,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });
  }

  /**
   * Find all task templates with pagination and filters
   */
  async findAll(
    organizationId: string,
    page: number,
    limit: number,
    filters: {
      isActive?: boolean;
      type?: string;
      search?: string;
    } = {},
  ): Promise<PaginatedResponse<TaskTemplateEntity>> {
    const { data, total } = await this.templateRepository.findAll(
      organizationId,
      page,
      limit,
      filters,
    );

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
   * Find task template by ID
   */
  async findById(id: string, organizationId: string): Promise<TaskTemplateEntity> {
    const template = await this.templateRepository.findById(id, organizationId);
    if (!template) {
      throw new NotFoundException(`Task template with ID ${id} not found`);
    }
    return template;
  }

  /**
   * Find templates by milestone template
   */
  async findByMilestoneTemplate(milestoneTemplateId: string): Promise<TaskTemplateEntity[]> {
    return this.templateRepository.findByMilestoneTemplate(milestoneTemplateId);
  }

  /**
   * Update task template
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateTaskTemplateDto,
    currentUserId: string,
  ): Promise<TaskTemplateEntity> {
    // Check if template exists
    await this.findById(id, organizationId);

    // Check if code is being updated and already exists
    if (updateDto.code) {
      const codeExists = await this.templateRepository.existsByCode(
        updateDto.code,
        organizationId,
        id,
      );
      if (codeExists) {
        throw new BadRequestException(`Task template with code ${updateDto.code} already exists`);
      }
    }

    const updated = await this.templateRepository.update(id, organizationId, {
      ...updateDto,
      updatedBy: currentUserId,
    });

    if (!updated) {
      throw new NotFoundException(`Task template with ID ${id} not found`);
    }

    return updated;
  }

  /**
   * Toggle template active status
   */
  async toggleStatus(
    id: string,
    organizationId: string,
    currentUserId: string,
  ): Promise<TaskTemplateEntity> {
    const template = await this.findById(id, organizationId);

    const updated = await this.templateRepository.update(id, organizationId, {
      isActive: !template.isActive,
      updatedBy: currentUserId,
    });

    if (!updated) {
      throw new NotFoundException(`Task template with ID ${id} not found`);
    }

    return updated;
  }

  /**
   * Delete task template
   */
  async remove(id: string, organizationId: string): Promise<void> {
    await this.findById(id, organizationId);

    const deleted = await this.templateRepository.softDelete(id, organizationId);
    if (!deleted) {
      throw new NotFoundException(`Task template with ID ${id} not found`);
    }
  }

  /**
   * Get statistics
   */
  async getStatistics(organizationId: string): Promise<StatisticsResponse> {
    const { total: totalActive } = await this.templateRepository.findAll(organizationId, 1, 1, {
      isActive: true,
    });

    const { total: totalInactive } = await this.templateRepository.findAll(organizationId, 1, 1, {
      isActive: false,
    });

    return {
      total: totalActive + totalInactive,
      byStatus: {
        active: totalActive,
        inactive: totalInactive,
      },
    };
  }
}

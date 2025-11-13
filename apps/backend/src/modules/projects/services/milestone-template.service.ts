import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type PaginatedResponse } from '@oneohm-epc/shared-types';
import { plainToInstance } from 'class-transformer';

import {
  CreateMilestoneTemplateDto,
  UpdateMilestoneTemplateDto,
  MilestoneTemplateResponseDto,
} from '../dto';
import { MilestoneTemplateRepository } from '../repositories';

/**
 * MilestoneTemplateService
 * Business logic for milestone templates
 */
@Injectable()
export class MilestoneTemplateService {
  constructor(private readonly templateRepository: MilestoneTemplateRepository) {}

  /**
   * Create a new milestone template
   */
  async create(
    createDto: CreateMilestoneTemplateDto,
    currentUserId: string,
  ): Promise<MilestoneTemplateResponseDto> {
    // Check if code already exists
    const codeUnique = await this.templateRepository.isCodeUnique(
      createDto.code,
      createDto.organizationId,
    );
    if (!codeUnique) {
      throw new BadRequestException(`Milestone template with code ${createDto.code} already exists`);
    }

    const template = await this.templateRepository.create({
      ...createDto,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });

    return plainToInstance(MilestoneTemplateResponseDto, template, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Find all milestone templates with pagination and filters
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
  ): Promise<PaginatedResponse<MilestoneTemplateResponseDto>> {
    const { data, total } = await this.templateRepository.findAll(
      organizationId,
      page,
      limit,
      filters,
    );

    return {
      data: plainToInstance(MilestoneTemplateResponseDto, data, {
        excludeExtraneousValues: true,
      }),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find milestone template by ID
   */
  async findById(id: string, organizationId: string): Promise<MilestoneTemplateResponseDto> {
    const template = await this.templateRepository.findById(id, organizationId);
    if (!template) {
      throw new NotFoundException(`Milestone template with ID ${id} not found`);
    }

    return plainToInstance(MilestoneTemplateResponseDto, template, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Find all active templates
   */
  async findAllActive(organizationId: string): Promise<MilestoneTemplateResponseDto[]> {
    const templates = await this.templateRepository.findAllActive(organizationId);

    return plainToInstance(MilestoneTemplateResponseDto, templates, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Find templates by type
   */
  async findByType(organizationId: string, type: string): Promise<MilestoneTemplateResponseDto[]> {
    const templates = await this.templateRepository.findByType(organizationId, type);

    return plainToInstance(MilestoneTemplateResponseDto, templates, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update milestone template
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateMilestoneTemplateDto,
    currentUserId: string,
  ): Promise<MilestoneTemplateResponseDto> {
    // Check if template exists
    await this.findById(id, organizationId);

    // Check if code is being updated and already exists
    if (updateDto.code) {
      const codeUnique = await this.templateRepository.isCodeUnique(
        updateDto.code,
        organizationId,
        id,
      );
      if (!codeUnique) {
        throw new BadRequestException(`Milestone template with code ${updateDto.code} already exists`);
      }
    }

    const updated = await this.templateRepository.update(id, organizationId, {
      ...updateDto,
      updatedBy: currentUserId,
    });

    if (!updated) {
      throw new NotFoundException(`Failed to update milestone template with ID ${id}`);
    }

    return plainToInstance(MilestoneTemplateResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Delete milestone template (soft delete)
   */
  async delete(id: string, organizationId: string): Promise<void> {
    // Check if template exists
    await this.findById(id, organizationId);

    const deleted = await this.templateRepository.delete(id, organizationId);
    if (!deleted) {
      throw new BadRequestException(`Failed to delete milestone template with ID ${id}`);
    }
  }

  /**
   * Get template count for organization
   */
  async getCount(organizationId: string): Promise<number> {
    return this.templateRepository.countByOrganization(organizationId);
  }
}


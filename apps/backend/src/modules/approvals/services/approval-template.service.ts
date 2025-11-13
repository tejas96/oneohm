import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type ExtendedStatisticsResponse,
 ApprovalWorkflowType } from '@oneohm-epc/shared-types';

import type {
  CreateApprovalTemplateDto,
  UpdateApprovalTemplateDto,
} from '../dto';
import type { ApprovalTemplateEntity } from '../entities';
import { ApprovalTemplateRepository } from '../repositories';

/**
 * ApprovalTemplateService
 * Business logic for approval templates
 */
@Injectable()
export class ApprovalTemplateService {
  constructor(
    private readonly templateRepository: ApprovalTemplateRepository,
  ) {}

  /**
   * Create a new approval template
   */
  async create(
    organizationId: string,
    createDto: CreateApprovalTemplateDto,
    createdBy: string,
  ): Promise<ApprovalTemplateEntity> {
    // Check if code already exists
    const existing = await this.templateRepository.findByCode(
      createDto.code,
      organizationId,
    );

    if (existing) {
      throw new BadRequestException(
        `Template with code "${createDto.code}" already exists`,
      );
    }

    // Validate stages order
    const stageOrders = createDto.stages.map((s) => s.stageOrder);
    const uniqueOrders = new Set(stageOrders);
    if (uniqueOrders.size !== stageOrders.length) {
      throw new BadRequestException('Stage orders must be unique');
    }

    // Create template with stages
    const { stages, ...templateData } = createDto;

    return this.templateRepository.create({
      ...templateData,
      organizationId,
      createdBy,
      updatedBy: createdBy,
      // TypeORM handles cascade creation - complex nested type requirements
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      stages: stages as any,
    });
  }

  /**
   * Find all templates
   */
  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters?: {
      workflowType?: ApprovalWorkflowType;
      isActive?: boolean;
      search?: string;
    },
  ): Promise<{ templates: ApprovalTemplateEntity[]; total: number }> {
    return this.templateRepository.findAll(organizationId, page, limit, filters);
  }

  /**
   * Find template by ID
   */
  async findById(
    id: string,
    organizationId: string,
  ): Promise<ApprovalTemplateEntity> {
    const template = await this.templateRepository.findById(id, organizationId);

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  /**
   * Find template by code
   */
  async findByCode(
    code: string,
    organizationId: string,
  ): Promise<ApprovalTemplateEntity> {
    const template = await this.templateRepository.findByCode(code, organizationId);

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  /**
   * Find templates by workflow type
   */
  async findByWorkflowType(
    workflowType: ApprovalWorkflowType,
    organizationId: string,
  ): Promise<ApprovalTemplateEntity[]> {
    return this.templateRepository.findByWorkflowType(workflowType, organizationId);
  }

  /**
   * Update template
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateApprovalTemplateDto,
    updatedBy: string,
  ): Promise<ApprovalTemplateEntity> {
    await this.findById(id, organizationId);

    // Check code uniqueness if code is being updated
    if (updateDto.code) {
      const existing = await this.templateRepository.findByCode(
        updateDto.code,
        organizationId,
      );

      if (existing && existing.id !== id) {
        throw new BadRequestException(
          `Template with code "${updateDto.code}" already exists`,
        );
      }
    }

    // Validate stages order if stages are being updated
    if (updateDto.stages) {
      const stageOrders = updateDto.stages.map((s) => s.stageOrder);
      const uniqueOrders = new Set(stageOrders);
      if (uniqueOrders.size !== stageOrders.length) {
        throw new BadRequestException('Stage orders must be unique');
      }
    }

    return this.templateRepository.update(id, organizationId, {
      ...updateDto,
      updatedBy,
    });
  }

  /**
   * Delete template
   */
  async delete(
    id: string,
    organizationId: string,
    deletedBy: string,
  ): Promise<void> {
    await this.findById(id, organizationId);
    await this.templateRepository.softDelete(id, organizationId, deletedBy);
  }

  /**
   * Get statistics
   */
  async getStatistics(
    organizationId: string,
  ): Promise<ExtendedStatisticsResponse<string, ApprovalWorkflowType>> {
    const byType = await this.templateRepository.countByWorkflowType(organizationId);
    const activeCount = await this.templateRepository.countActive(organizationId);

    return {
      total: Object.values(byType).reduce((sum, count) => sum + count, 0),
      byStatus: {
        active: activeCount,
        inactive: Object.values(byType).reduce((sum, count) => sum + count, 0) - activeCount,
      },
      byType,
    };
  }

  /**
   * Toggle template status
   */
  async toggleStatus(
    id: string,
    organizationId: string,
    updatedBy: string,
  ): Promise<ApprovalTemplateEntity> {
    const template = await this.findById(id, organizationId);

    return this.templateRepository.update(id, organizationId, {
      isActive: !template.isActive,
      updatedBy,
    });
  }
}


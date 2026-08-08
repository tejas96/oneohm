import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type PaginatedResponse, type StatisticsResponse } from '@tejas96/shared/types';

import { type WorkflowStepEntity } from '../entities';
import { ProjectTaskRepository, WorkflowStepRepository } from '../repositories';

@Injectable()
export class WorkflowStepService {
  constructor(
    private readonly stepRepository: WorkflowStepRepository,
    private readonly taskRepository: ProjectTaskRepository,
  ) {}

  async create(
    createDto: Partial<WorkflowStepEntity> & { code: string },
    currentUserId: string,
  ): Promise<WorkflowStepEntity> {
    const codeExists = await this.stepRepository.existsByCode(
      createDto.code,
    );
    if (codeExists) {
      throw new BadRequestException(`Workflow step with code ${createDto.code} already exists`);
    }

    return this.stepRepository.create({
      ...createDto,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    } as Partial<WorkflowStepEntity>);
  }

  async findAll(
    page: number,
    limit: number,
    filters: {
      isActive?: boolean;
      type?: string;
      search?: string;
    } = {},
  ): Promise<PaginatedResponse<WorkflowStepEntity>> {
    const { data, total } = await this.stepRepository.findAll(page, limit, filters);

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

  async findById(id: string): Promise<WorkflowStepEntity> {
    const step = await this.stepRepository.findById(id);
    if (!step) {
      throw new NotFoundException(`Workflow step with ID ${id} not found`);
    }
    return step;
  }

  async findAllActive(): Promise<WorkflowStepEntity[]> {
    return this.stepRepository.findAllActive();
  }

  async update(
    id: string,
    updateDto: Partial<WorkflowStepEntity>,
    currentUserId: string,
  ): Promise<WorkflowStepEntity> {
    await this.findById(id);

    if (updateDto.code) {
      const codeExists = await this.stepRepository.existsByCode(updateDto.code, id);
      if (codeExists) {
        throw new BadRequestException(`Workflow step with code ${updateDto.code} already exists`);
      }
    }

    const updated = await this.stepRepository.update(id, {
      ...updateDto,
      updatedBy: currentUserId,
    });

    if (!updated) {
      throw new NotFoundException(`Workflow step with ID ${id} not found`);
    }

    return updated;
  }

  async toggleStatus(
    id: string,
    currentUserId: string,
  ): Promise<WorkflowStepEntity> {
    const step = await this.findById(id);

    const updated = await this.stepRepository.update(id, {
      isActive: !step.isActive,
      updatedBy: currentUserId,
    });

    if (!updated) {
      throw new NotFoundException(`Workflow step with ID ${id} not found`);
    }

    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);

    const activeTaskCount = await this.taskRepository.countByWorkflowStepId(id);
    if (activeTaskCount > 0) {
      throw new ConflictException(
        `Cannot delete workflow step: ${activeTaskCount} active task(s) reference it`,
      );
    }

    const deleted = await this.stepRepository.softDelete(id);
    if (!deleted) {
      throw new NotFoundException(`Workflow step with ID ${id} not found`);
    }
  }

  async getStatistics(): Promise<StatisticsResponse> {
    const { total: totalActive } = await this.stepRepository.findAll(1, 1, {
      isActive: true,
    });

    const { total: totalInactive } = await this.stepRepository.findAll(1, 1, {
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

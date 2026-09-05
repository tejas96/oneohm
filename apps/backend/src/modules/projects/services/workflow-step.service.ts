import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  type ChangeRequestType,
  type PaginatedResponse,
  type StatisticsResponse,
} from '@tejas96/shared/types';
import { DataSource, type EntityManager } from 'typeorm';

import { type WorkflowStepEntity } from '../entities';
import { ProjectTaskRepository, WorkflowStepRepository } from '../repositories';

@Injectable()
export class WorkflowStepService {
  private readonly logger = new Logger(WorkflowStepService.name);

  constructor(
    private readonly stepRepository: WorkflowStepRepository,
    private readonly taskRepository: ProjectTaskRepository,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createDto: Partial<WorkflowStepEntity> & { code: string },
    currentUserId: string,
  ): Promise<WorkflowStepEntity> {
    const codeExists = await this.stepRepository.existsByCode(createDto.code);
    if (codeExists) {
      throw new BadRequestException(`Workflow step with code ${createDto.code} already exists`);
    }

    await this.assertChangeRequestShape(createDto);

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
    const existing = await this.findById(id);

    if (updateDto.code) {
      const codeExists = await this.stepRepository.existsByCode(updateDto.code, id);
      if (codeExists) {
        throw new BadRequestException(`Workflow step with code ${updateDto.code} already exists`);
      }
    }

    await this.assertChangeRequestShape({ ...existing, ...updateDto }, id);

    const renamedFrom =
      updateDto.code && updateDto.code !== existing.code ? existing.code : undefined;

    // The rename and the dependency rewrite have to land together. Half of this
    // leaves other steps pointing at a code that no longer exists, which project
    // creation then drops with nothing but a log line.
    return this.dataSource.transaction(async (manager) => {
      const updated = await this.stepRepository.update(
        id,
        {
          ...updateDto,
          updatedBy: currentUserId,
        },
        manager,
      );

      if (!updated) {
        throw new NotFoundException(`Workflow step with ID ${id} not found`);
      }

      if (renamedFrom) {
        await this.cascadeCodeRename(renamedFrom, updated.code, currentUserId, manager);
      }

      return updated;
    });
  }

  async toggleStatus(id: string, currentUserId: string): Promise<WorkflowStepEntity> {
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
    const step = await this.findById(id);

    // Counts every task that still exists, completed ones included -- a finished
    // task keeps pointing at the step for history, so the step cannot go.
    const taskCount = await this.taskRepository.countByWorkflowStepId(id);
    if (taskCount > 0) {
      throw new ConflictException(
        `Cannot delete workflow step: ${taskCount} task(s) reference it`,
      );
    }

    // Dependency codes are a text[], not a foreign key, so deleting a step leaves
    // every dependent pointing at a code that no longer resolves -- project
    // creation then drops that gate with nothing but a log line. Refuse, and let
    // the admin re-point the dependents first.
    const dependents = await this.stepRepository.findByDependencyCode(step.code);
    if (dependents.length > 0) {
      const codes = dependents.map((d) => d.code).join(', ');
      throw new ConflictException(
        `Cannot delete workflow step: ${codes} ${dependents.length === 1 ? 'depends' : 'depend'} on it`,
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

  /**
   * A change-request template is only reachable through its type, so the pair has
   * to stay whole and unique: `isSpecial` without a type can never be matched to a
   * request, and two live templates sharing a type make the match arbitrary. The
   * database enforces the uniqueness half already -- this turns that constraint
   * into a message the admin can act on instead of a 500.
   */
  private async assertChangeRequestShape(
    step: {
      isSpecial?: boolean;
      changeRequestType?: ChangeRequestType | null;
      isActive?: boolean;
    },
    excludeId?: string,
  ): Promise<void> {
    if (!step.isSpecial) {
      if (step.changeRequestType) {
        throw new BadRequestException(
          'changeRequestType can only be set on a change request step',
        );
      }
      return;
    }

    if (!step.changeRequestType) {
      throw new BadRequestException('A change request step needs a change request type');
    }

    const taken = await this.stepRepository.existsChangeRequestType(
      step.changeRequestType,
      excludeId,
    );
    if (taken) {
      throw new BadRequestException(
        `A change request step for "${step.changeRequestType}" already exists. ` +
          'Delete or re-type that step first.',
      );
    }
  }

  /**
   * Point every dependent at the new spelling. Dependency codes are a text[],
   * not a foreign key, so nothing in the database does this for us.
   */
  private async cascadeCodeRename(
    oldCode: string,
    newCode: string,
    currentUserId: string,
    manager: EntityManager,
  ): Promise<void> {
    const dependents = await this.stepRepository.findByDependencyCode(oldCode, manager);

    for (const dependent of dependents) {
      const rewritten = [
        ...new Set((dependent.dependsOnTaskCodes ?? []).map((c) => (c === oldCode ? newCode : c))),
      ];

      await this.stepRepository.update(
        dependent.id,
        { dependsOnTaskCodes: rewritten, updatedBy: currentUserId },
        manager,
      );
    }

    if (dependents.length > 0) {
      this.logger.log(
        `Renamed step code "${oldCode}" -> "${newCode}"; rewrote dependencies on ${dependents
          .map((d) => d.code)
          .join(', ')}`,
      );
    }
  }
}

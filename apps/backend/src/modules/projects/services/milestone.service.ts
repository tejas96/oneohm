import { BadRequestException, Injectable } from '@nestjs/common';
import { MilestoneStatus, MilestoneType } from '@oneohm-epc/shared-types';

import { CreateMilestoneDto, UpdateMilestoneDto } from '../dto';
import { ProjectMilestoneEntity } from '../entities/project-milestone.entity';
import { MilestoneRepository, ProjectRepository } from '../repositories';
import { ProjectService } from './project.service';

/**
 * Milestone Service
 * Business logic for project milestone management
 */
@Injectable()
export class MilestoneService {
  constructor(
    private readonly milestoneRepository: MilestoneRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly projectService: ProjectService,
  ) {}

  /**
   * Create a new milestone
   */
  async create(
    organizationId: string,
    createDto: CreateMilestoneDto,
  ): Promise<ProjectMilestoneEntity> {
    // Verify project exists and belongs to organization
    await this.projectRepository.findById(createDto.projectId, organizationId);

    // Validate dependencies if provided
    if (createDto.dependencies && createDto.dependencies.length > 0) {
      await this.validateDependencies(createDto.projectId, createDto.dependencies);
    }

    // Create milestone
    const milestone = await this.milestoneRepository.create({
      projectId: createDto.projectId,
      assignedTo: createDto.assignedTo,
      name: createDto.name,
      description: createDto.description,
      milestoneType: createDto.milestoneType,
      status: createDto.status || MilestoneStatus.PENDING,
      sequenceOrder: createDto.sequenceOrder,
      progressPercentage: createDto.progressPercentage || 0,
      plannedStartDate: createDto.plannedStartDate
        ? new Date(createDto.plannedStartDate)
        : undefined,
      plannedEndDate: createDto.plannedEndDate ? new Date(createDto.plannedEndDate) : undefined,
      actualStartDate: createDto.actualStartDate ? new Date(createDto.actualStartDate) : undefined,
      actualEndDate: createDto.actualEndDate ? new Date(createDto.actualEndDate) : undefined,
      dependencies: createDto.dependencies,
      deliverables: createDto.deliverables,
      notes: createDto.notes,
    });

    // Recalculate project progress
    await this.projectService.calculateProgress(createDto.projectId, organizationId);

    return this.milestoneRepository.findById(milestone.id, createDto.projectId);
  }

  /**
   * Find all milestones for a project
   */
  async findByProject(
    projectId: string,
    organizationId: string,
    filters?: {
      status?: MilestoneStatus;
      milestoneType?: MilestoneType;
      assignedTo?: string;
    },
  ): Promise<ProjectMilestoneEntity[]> {
    // Verify project exists
    await this.projectRepository.findById(projectId, organizationId);

    return this.milestoneRepository.findByProject(projectId, filters);
  }

  /**
   * Find milestone by ID
   */
  async findById(
    id: string,
    projectId: string,
    organizationId: string,
  ): Promise<ProjectMilestoneEntity> {
    // Verify project exists
    await this.projectRepository.findById(projectId, organizationId);

    return this.milestoneRepository.findById(id, projectId);
  }

  /**
   * Update a milestone
   */
  async update(
    id: string,
    projectId: string,
    organizationId: string,
    updateDto: UpdateMilestoneDto,
  ): Promise<ProjectMilestoneEntity> {
    // Verify project exists
    await this.projectRepository.findById(projectId, organizationId);

    // Verify milestone exists
    await this.milestoneRepository.findById(id, projectId);

    // Validate dependencies if provided
    if (updateDto.dependencies && updateDto.dependencies.length > 0) {
      await this.validateDependencies(projectId, updateDto.dependencies, id);
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      ...updateDto,
      plannedStartDate: updateDto.plannedStartDate
        ? new Date(updateDto.plannedStartDate)
        : undefined,
      plannedEndDate: updateDto.plannedEndDate ? new Date(updateDto.plannedEndDate) : undefined,
      actualStartDate: updateDto.actualStartDate ? new Date(updateDto.actualStartDate) : undefined,
      actualEndDate: updateDto.actualEndDate ? new Date(updateDto.actualEndDate) : undefined,
    };

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await this.milestoneRepository.update(id, projectId, updateData);

    // Recalculate project progress if milestone progress changed
    if (updateDto.progressPercentage !== undefined) {
      await this.projectService.calculateProgress(projectId, organizationId);
    }

    return this.milestoneRepository.findById(id, projectId);
  }

  /**
   * Delete a milestone
   */
  async delete(id: string, projectId: string, organizationId: string): Promise<void> {
    // Verify project exists
    await this.projectRepository.findById(projectId, organizationId);

    // Verify milestone exists
    const milestone = await this.milestoneRepository.findById(id, projectId);

    // Check if milestone can be deleted (only pending/skipped)
    if (
      milestone.status !== MilestoneStatus.PENDING &&
      milestone.status !== MilestoneStatus.SKIPPED
    ) {
      throw new BadRequestException(
        `Cannot delete milestone with status ${milestone.status}. Only pending or skipped milestones can be deleted.`,
      );
    }

    // Check if other milestones depend on this one
    const allMilestones = await this.milestoneRepository.findByProject(projectId);
    const dependentMilestones = allMilestones.filter((m) => m.dependencies?.includes(id));

    if (dependentMilestones.length > 0) {
      throw new BadRequestException(
        `Cannot delete milestone. ${dependentMilestones.length} other milestone(s) depend on it.`,
      );
    }

    await this.milestoneRepository.delete(id, projectId);

    // Recalculate project progress
    await this.projectService.calculateProgress(projectId, organizationId);
  }

  /**
   * Update milestone status with validation
   */
  async updateStatus(
    id: string,
    projectId: string,
    organizationId: string,
    newStatus: MilestoneStatus,
  ): Promise<ProjectMilestoneEntity> {
    // Verify project exists
    await this.projectRepository.findById(projectId, organizationId);

    const milestone = await this.milestoneRepository.findById(id, projectId);

    // Check dependencies are completed before starting
    if (newStatus === MilestoneStatus.IN_PROGRESS && milestone.dependencies) {
      await this.checkDependenciesCompleted(projectId, milestone.dependencies);
    }

    // Update actual dates based on status
    const updateData: Record<string, unknown> = { status: newStatus };

    if (newStatus === MilestoneStatus.IN_PROGRESS && !milestone.actualStartDate) {
      updateData.actualStartDate = new Date();
    }

    if (newStatus === MilestoneStatus.COMPLETED && !milestone.actualEndDate) {
      updateData.actualEndDate = new Date();
      updateData.progressPercentage = 100;
    }

    if (newStatus === MilestoneStatus.SKIPPED) {
      updateData.progressPercentage = 0;
    }

    await this.milestoneRepository.update(id, projectId, updateData);

    // Recalculate project progress
    await this.projectService.calculateProgress(projectId, organizationId);

    return this.milestoneRepository.findById(id, projectId);
  }

  /**
   * Update milestone progress
   */
  async updateProgress(
    id: string,
    projectId: string,
    organizationId: string,
    progressPercentage: number,
  ): Promise<ProjectMilestoneEntity> {
    // Verify project exists
    await this.projectRepository.findById(projectId, organizationId);

    // Validate progress value
    if (progressPercentage < 0 || progressPercentage > 100) {
      throw new BadRequestException('Progress percentage must be between 0 and 100');
    }

    await this.milestoneRepository.updateProgress(id, projectId, progressPercentage);

    // Recalculate project progress
    await this.projectService.calculateProgress(projectId, organizationId);

    return this.milestoneRepository.findById(id, projectId);
  }

  /**
   * Validate milestone dependencies exist
   */
  private async validateDependencies(
    projectId: string,
    dependencies: string[],
    excludeId?: string,
  ): Promise<void> {
    for (const depId of dependencies) {
      if (depId === excludeId) {
        throw new BadRequestException('Milestone cannot depend on itself');
      }

      try {
        await this.milestoneRepository.findById(depId, projectId);
      } catch {
        throw new BadRequestException(`Dependency milestone ${depId} not found`);
      }
    }
  }

  /**
   * Check if all dependencies are completed
   */
  private async checkDependenciesCompleted(
    projectId: string,
    dependencies: string[],
  ): Promise<void> {
    for (const depId of dependencies) {
      const depMilestone = await this.milestoneRepository.findById(depId, projectId);
      if (depMilestone.status !== MilestoneStatus.COMPLETED) {
        throw new BadRequestException(
          `Cannot start milestone. Dependency "${depMilestone.name}" is not completed yet.`,
        );
      }
    }
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MilestoneStatus, MilestoneType } from '@oneohm-epc/shared-types';
import { IsNull, Repository } from 'typeorm';

import { ProjectMilestoneEntity } from '../entities/project-milestone.entity';

/**
 * Project Milestone Repository
 * Handles database operations for project milestones
 */
@Injectable()
export class MilestoneRepository {
  constructor(
    @InjectRepository(ProjectMilestoneEntity)
    private readonly repository: Repository<ProjectMilestoneEntity>,
  ) {}

  /**
   * Create a new milestone
   */
  async create(milestoneData: Partial<ProjectMilestoneEntity>): Promise<ProjectMilestoneEntity> {
    const milestone = this.repository.create(milestoneData);
    return this.repository.save(milestone);
  }

  /**
   * Find milestone by ID
   */
  async findById(id: string, projectId: string): Promise<ProjectMilestoneEntity> {
    const milestone = await this.repository.findOne({
      where: { id, projectId },
      relations: ['project', 'assignee'],
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone with ID ${id} not found`);
    }

    return milestone;
  }

  /**
   * Find all milestones for a project
   */
  async findByProject(
    projectId: string,
    filters?: {
      status?: MilestoneStatus;
      milestoneType?: MilestoneType;
      assignedTo?: string;
    },
  ): Promise<ProjectMilestoneEntity[]> {
    const query = this.repository
      .createQueryBuilder('milestone')
      .leftJoinAndSelect('milestone.assignee', 'assignee')
      .where('milestone.projectId = :projectId', { projectId })
      .andWhere('milestone.deletedAt IS NULL');

    // Apply filters
    if (filters?.status) {
      query.andWhere('milestone.status = :status', { status: filters.status });
    }

    if (filters?.milestoneType) {
      query.andWhere('milestone.milestoneType = :milestoneType', {
        milestoneType: filters.milestoneType,
      });
    }

    if (filters?.assignedTo) {
      query.andWhere('milestone.assignedTo = :assignedTo', { assignedTo: filters.assignedTo });
    }

    return query.orderBy('milestone.sequenceOrder', 'ASC').getMany();
  }

  /**
   * Update a milestone
   */
  async update(
    id: string,
    projectId: string,
    updateData: Record<string, unknown>,
  ): Promise<ProjectMilestoneEntity> {
    await this.repository.update({ id, projectId }, updateData);
    return this.findById(id, projectId);
  }

  /**
   * Delete a milestone
   */
  async delete(id: string, projectId: string): Promise<void> {
    const result = await this.repository.softDelete({ id, projectId });

    if (!result.affected || result.affected === 0) {
      throw new NotFoundException(`Milestone with ID ${id} not found`);
    }
  }

  /**
   * Update milestone status
   */
  async updateStatus(
    id: string,
    projectId: string,
    status: MilestoneStatus,
  ): Promise<ProjectMilestoneEntity> {
    await this.repository.update({ id, projectId }, { status });
    return this.findById(id, projectId);
  }

  /**
   * Update milestone progress
   */
  async updateProgress(
    id: string,
    projectId: string,
    progressPercentage: number,
  ): Promise<ProjectMilestoneEntity> {
    await this.repository.update({ id, projectId }, { progressPercentage });
    return this.findById(id, projectId);
  }

  /**
   * Find pending milestones for a project
   */
  async findPending(projectId: string): Promise<ProjectMilestoneEntity[]> {
    return this.repository.find({
      where: {
        projectId,
        status: MilestoneStatus.PENDING,
        deletedAt: IsNull(),
      },
      order: { sequenceOrder: 'ASC' },
    });
  }

  /**
   * Count milestones by status
   */
  async countByStatus(projectId: string, status: MilestoneStatus): Promise<number> {
    return this.repository.count({
      where: { projectId, status, deletedAt: IsNull() },
    });
  }
}

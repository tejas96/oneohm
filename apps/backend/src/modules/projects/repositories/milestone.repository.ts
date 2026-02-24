import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MilestoneStatus, MilestoneType } from '@oneohm-epc/shared-types';
import { type EntityManager, IsNull, Repository } from 'typeorm';

import { generateEntityCode } from '../../../common/utils/code-generator.util';
import { ProjectMilestoneEntity } from '../entities/project-milestone.entity';

/**
 * Project Milestone Repository
 * Handles database operations for project milestones
 */
@Injectable()
export class MilestoneRepository {
  constructor(
    @InjectRepository(ProjectMilestoneEntity)
    public readonly repository: Repository<ProjectMilestoneEntity>,
  ) {}
  /**
   * Create a new milestone
   */
  async create(
    milestoneData: Partial<ProjectMilestoneEntity>,
    manager?: EntityManager,
  ): Promise<ProjectMilestoneEntity> {
    const repo = this.getRepo(manager);
    const milestone = repo.create(milestoneData);
    return repo.save(milestone);
  }

  /**
   * Update milestone by ID (no project ownership check — use inside transactions where ownership is pre-validated)
   */
  async updateById(
    id: string,
    data: Record<string, unknown>,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = this.getRepo(manager);
    await repo.update(id, data);
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
   * Recalculate and update progress for all milestones in a project.
   * Uses a single SQL statement for efficiency.
   */
  async updateProgressForProject(projectId: string, manager?: EntityManager): Promise<void> {
    const repo = this.getRepo(manager);
    await repo.query(
      `
      UPDATE project_milestones pm
      SET progress_percentage = COALESCE((
        SELECT ROUND(100.0 *
          COUNT(*) FILTER (WHERE pt.status = 'done') /
          NULLIF(COUNT(*) FILTER (WHERE pt.status != 'cancelled'), 0)
        )
        FROM project_tasks pt
        WHERE pt.milestone_id = pm.id AND pt.deleted_at IS NULL
      ), 0)
      WHERE pm.project_id = $1 AND pm.deleted_at IS NULL
      `,
      [projectId],
    );
  }

  /**
   * Count milestones by status
   */
  async countByStatus(projectId: string, status: MilestoneStatus): Promise<number> {
    return this.repository.count({
      where: { projectId, status, deletedAt: IsNull() },
    });
  }

  /**
   * Generate a unique milestone code (e.g. MS-ONEOHM-2026-0001)
   */
  async generateMilestoneCode(orgCode: string): Promise<string> {
    return generateEntityCode(this.repository, 'milestoneCode', 'MS', orgCode, 'milestone_code');
  }

  private getRepo(manager?: EntityManager): Repository<ProjectMilestoneEntity> {
    return manager ? manager.getRepository(ProjectMilestoneEntity) : this.repository;
  }
}

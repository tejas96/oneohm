import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type EntityManager, IsNull, type Repository } from 'typeorm';

import { ProjectTeamMemberEntity } from '../entities/project-team-member.entity';

/**
 * ProjectTeamRepository
 * Data access layer for project team members
 */
@Injectable()
export class ProjectTeamRepository {
  constructor(
    @InjectRepository(ProjectTeamMemberEntity)
    public readonly repository: Repository<ProjectTeamMemberEntity>,
  ) {}
  /**
   * Create a new team member assignment
   */
  async create(
    data: Partial<ProjectTeamMemberEntity>,
    manager?: EntityManager,
  ): Promise<ProjectTeamMemberEntity> {
    const repo = this.getRepo(manager);
    const member = repo.create(data);
    return repo.save(member);
  }

  /**
   * Find a team member by user+project (transaction-aware)
   */
  async findOneByUserAndProject(
    userId: string,
    projectId: string,
    manager?: EntityManager,
  ): Promise<ProjectTeamMemberEntity | null> {
    const repo = this.getRepo(manager);
    return repo.findOneBy({ userId, projectId });
  }

  /**
   * Find team member by ID
   */
  async findById(id: string, projectId: string): Promise<ProjectTeamMemberEntity | null> {
    return this.repository.findOne({
      where: {
        id,
        projectId,
        deletedAt: IsNull(),
      },
      relations: ['user', 'project'],
    });
  }

  /**
   * Find team member by user and project
   */
  async findByUserAndProject(
    userId: string,
    projectId: string,
  ): Promise<ProjectTeamMemberEntity | null> {
    return this.repository.findOne({
      where: {
        userId,
        projectId,
        deletedAt: IsNull(),
      },
      relations: ['user'],
    });
  }

  /**
   * Find all team members for a project
   */
  async findByProject(
    projectId: string,
    manager?: EntityManager,
  ): Promise<ProjectTeamMemberEntity[]> {
    const repo = this.getRepo(manager);
    return repo.find({
      where: {
        projectId,
        deletedAt: IsNull(),
      },
      relations: ['user'],
      order: {
        isProjectManager: 'DESC',
        joinedAt: 'ASC',
      },
    });
  }

  /**
   * Find all projects for a user
   */
  async findByUser(userId: string): Promise<ProjectTeamMemberEntity[]> {
    return this.repository.find({
      where: {
        userId,
        deletedAt: IsNull(),
      },
      relations: ['project'],
      order: {
        joinedAt: 'DESC',
      },
    });
  }

  /**
   * Find project manager for a project
   */
  async findProjectManager(projectId: string): Promise<ProjectTeamMemberEntity | null> {
    return this.repository.findOne({
      where: {
        projectId,
        isProjectManager: true,
        deletedAt: IsNull(),
      },
      relations: ['user'],
    });
  }

  /**
   * Update team member
   */
  async update(
    id: string,
    projectId: string,
    data: {
      roleName?: string;
      isProjectManager?: boolean;
    },
  ): Promise<ProjectTeamMemberEntity | null> {
    await this.repository.update(
      {
        id,
        projectId,
        deletedAt: IsNull(),
      },
      data,
    );
    return this.findById(id, projectId);
  }

  /**
   * Soft delete team member
   */
  async softDelete(id: string, projectId: string): Promise<boolean> {
    const result = await this.repository.softDelete({
      id,
      projectId,
    });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Check if user is team member of project
   */
  async isTeamMember(userId: string, projectId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        userId,
        projectId,
        deletedAt: IsNull(),
      },
    });
    return count > 0;
  }

  /**
   * Check if user is project manager
   */
  async isProjectManager(userId: string, projectId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        userId,
        projectId,
        isProjectManager: true,
        deletedAt: IsNull(),
      },
    });
    return count > 0;
  }

  /**
   * Count team members for a project
   */
  async countByProject(projectId: string): Promise<number> {
    return this.repository.count({
      where: {
        projectId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Find team members by role
   */
  async findByRole(projectId: string, roleName: string): Promise<ProjectTeamMemberEntity[]> {
    return this.repository.find({
      where: {
        projectId,
        roleName,
        deletedAt: IsNull(),
      },
      relations: ['user'],
    });
  }

  private getRepo(manager?: EntityManager): Repository<ProjectTeamMemberEntity> {
    return manager ? manager.getRepository(ProjectTeamMemberEntity) : this.repository;
  }
}

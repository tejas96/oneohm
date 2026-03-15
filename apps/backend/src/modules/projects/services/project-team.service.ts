import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TaskStatus } from '@oneohm-epc/shared/types';

import { type AddTeamMemberDto, type UpdateTeamMemberDto } from '../dto/project-team';
import { type ProjectTeamMemberEntity } from '../entities';
import { ProjectTeamRepository } from '../repositories/project-team.repository';

/**
 * Internal input type that extends DTO with projectId from URL
 */
interface AddTeamMemberInput extends AddTeamMemberDto {
  projectId: string;
  organizationId: string;
}

/**
 * ProjectTeamService
 * Business logic for project team management
 */
@Injectable()
export class ProjectTeamService {
  constructor(private readonly teamRepository: ProjectTeamRepository) {}

  /**
   * Add a new team member to a project
   */
  async addMember(dto: AddTeamMemberInput): Promise<ProjectTeamMemberEntity> {
    const existing = await this.teamRepository.findByUserAndProject(dto.userId, dto.projectId);
    if (existing) {
      throw new BadRequestException('User is already a team member of this project');
    }

    if (dto.isProjectManager) {
      const currentPM = await this.teamRepository.findProjectManager(dto.projectId);
      if (currentPM) {
        await this.teamRepository.update(currentPM.id, dto.projectId, {
          isProjectManager: false,
        });
      }
    }

    const member = await this.teamRepository.create({
      projectId: dto.projectId,
      userId: dto.userId,
      roleName: dto.roleName,
      isProjectManager: dto.isProjectManager ?? false,
    });

    return member;
  }

  /**
   * Get all team members for a project
   */
  async getTeamMembers(projectId: string): Promise<ProjectTeamMemberEntity[]> {
    return this.teamRepository.findByProject(projectId);
  }

  /**
   * Get a specific team member
   */
  async getTeamMember(id: string, projectId: string): Promise<ProjectTeamMemberEntity> {
    const member = await this.teamRepository.findById(id, projectId);
    if (!member) {
      throw new NotFoundException(`Team member with ID ${id} not found`);
    }
    return member;
  }

  /**
   * Update a team member
   */
  async updateMember(
    id: string,
    projectId: string,
    dto: UpdateTeamMemberDto,
  ): Promise<ProjectTeamMemberEntity> {
    const existing = await this.getTeamMember(id, projectId);

    // If setting as project manager, remove existing project manager
    if (dto.isProjectManager && !existing.isProjectManager) {
      const currentPM = await this.teamRepository.findProjectManager(projectId);
      if (currentPM && currentPM.id !== id) {
        await this.teamRepository.update(currentPM.id, projectId, {
          isProjectManager: false,
        });
      }
    }

    const updated = await this.teamRepository.update(id, projectId, dto);
    if (!updated) {
      throw new NotFoundException(`Team member with ID ${id} not found`);
    }

    return updated;
  }

  /**
   * Remove a team member from a project
   */
  async removeMember(id: string, projectId: string): Promise<void> {
    await this.getTeamMember(id, projectId);

    const deleted = await this.teamRepository.softDelete(id, projectId);
    if (!deleted) {
      throw new NotFoundException(`Team member with ID ${id} not found`);
    }
  }

  /**
   * Check if user is a team member of the project
   */
  async isTeamMember(userId: string, projectId: string): Promise<boolean> {
    return this.teamRepository.isTeamMember(userId, projectId);
  }

  /**
   * Check if user is project manager
   */
  async isProjectManager(userId: string, projectId: string): Promise<boolean> {
    return this.teamRepository.isProjectManager(userId, projectId);
  }

  /**
   * Get all projects for a user
   */
  async getUserProjects(userId: string): Promise<ProjectTeamMemberEntity[]> {
    return this.teamRepository.findByUser(userId);
  }

  /**
   * Get team member count for a project
   */
  async getTeamCount(projectId: string): Promise<number> {
    return this.teamRepository.countByProject(projectId);
  }

  /**
   * Get workload summary for users across projects within an organization.
   * Returns per-user: activeProjectCount, totalTaskCount, inProgressTaskCount, notCompletedTaskCount.
   */
  async getUserWorkloads(organizationId: string): Promise<
    Array<{
      userId: string;
      firstName: string;
      lastName: string;
      activeProjectCount: number;
      totalTaskCount: number;
      inProgressTaskCount: number;
      notCompletedTaskCount: number;
    }>
  > {
    const results = await this.teamRepository.repository
      .createQueryBuilder('tm')
      .select('tm.userId', 'userId')
      .addSelect('u.first_name', 'firstName')
      .addSelect('u.last_name', 'lastName')
      .addSelect('COUNT(DISTINCT tm.projectId)', 'activeProjectCount')
      .addSelect(`COALESCE(SUM(CASE WHEN t.id IS NOT NULL THEN 1 ELSE 0 END), 0)`, 'totalTaskCount')
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.status = '${TaskStatus.IN_PROGRESS}' THEN 1 ELSE 0 END), 0)`,
        'inProgressTaskCount',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.status NOT IN ('${TaskStatus.DONE}', '${TaskStatus.CANCELLED}') AND t.id IS NOT NULL THEN 1 ELSE 0 END), 0)`,
        'notCompletedTaskCount',
      )
      .innerJoin('users', 'u', 'u.id = tm.userId')
      .innerJoin('projects', 'p', 'p.id = tm.projectId AND p.deleted_at IS NULL')
      .innerJoin(
        'customer_properties',
        'cp',
        'cp.id = p.property_id AND cp.organization_id = :orgId',
        { orgId: organizationId },
      )
      .leftJoin(
        'project_tasks',
        't',
        't.assigned_to_user_id = tm.userId AND t.project_id = tm.projectId AND t.deleted_at IS NULL',
      )
      .where('tm.deletedAt IS NULL')
      .groupBy('tm.userId')
      .addGroupBy('u.first_name')
      .addGroupBy('u.last_name')
      .orderBy('"activeProjectCount"', 'DESC')
      .getRawMany();

    return results.map((r) => ({
      userId: r.userId,
      firstName: r.firstName,
      lastName: r.lastName,
      activeProjectCount: parseInt(r.activeProjectCount, 10),
      totalTaskCount: parseInt(r.totalTaskCount, 10),
      inProgressTaskCount: parseInt(r.inProgressTaskCount, 10),
      notCompletedTaskCount: parseInt(r.notCompletedTaskCount, 10),
    }));
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { type AddTeamMemberDto, type UpdateTeamMemberDto } from '../dto/project-team';
import { type ProjectTeamMemberEntity } from '../entities';
import { ProjectTaskRepository } from '../repositories/project-task.repository';
import { ProjectTeamRepository } from '../repositories/project-team.repository';

/**
 * Internal input type that extends DTO with projectId from URL
 */
interface AddTeamMemberInput extends AddTeamMemberDto {
  projectId: string;
}

/**
 * ProjectTeamService
 * Business logic for project team management
 */
@Injectable()
export class ProjectTeamService {
  constructor(
    private readonly teamRepository: ProjectTeamRepository,
    private readonly taskRepository: ProjectTaskRepository,
  ) {}

  /**
   * Add a new team member to a project
   */
  async addMember(dto: AddTeamMemberInput): Promise<ProjectTeamMemberEntity> {
    // Check if user is already a team member
    const existing = await this.teamRepository.findByUserAndProject(dto.userId, dto.projectId);
    if (existing) {
      throw new BadRequestException('User is already a team member of this project');
    }

    // If setting as project manager, remove existing project manager
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

    // Auto-assign unassigned tasks with matching role
    await this.autoAssignTasksByRole(dto.projectId, member.userId, dto.roleName);

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
   * Auto-assign unassigned tasks to a new team member based on role
   * This is called when a new member is added to the project
   */
  private async autoAssignTasksByRole(
    projectId: string,
    _userId: string,
    _roleName: string,
  ): Promise<void> {
    // Get all unassigned tasks for the project
    const { data: tasks } = await this.taskRepository.findAll(projectId, 1, 1000, {});

    // Filter to unassigned tasks
    const unassignedTasks = tasks.filter((task) => !task.assignedToUserId);

    // For now, we could implement role-based auto-assign if task templates have defaultRoleCode
    // This is a placeholder for future enhancement
    // The logic would be: if task.template?.defaultRoleCode === roleName, assign to user

    // Log for debugging (remove in production)
    if (unassignedTasks.length > 0) {
      // Future: implement role-based auto-assignment
    }
  }
}

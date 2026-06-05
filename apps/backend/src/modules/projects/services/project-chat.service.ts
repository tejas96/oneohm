import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';

import { hasAdminBypassRole } from '../../iam/constants';
import { ProjectChatMessageEntity } from '../entities/project-chat-message.entity';
import { ProjectChatRepository } from '../repositories/project-chat.repository';
import { ProjectTeamRepository } from '../repositories/project-team.repository';
import { ProjectRepository } from '../repositories/project.repository';

@Injectable()
export class ProjectChatService {
  constructor(
    private readonly chatRepository: ProjectChatRepository,
    private readonly teamRepository: ProjectTeamRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  /**
   * Validate that the user has permission to access the chat of a project.
   * Allowed: Customers owning the project, project team members, and admins.
   */
  private async validateChatAccess(
    projectId: string,
    userId: string,
    roles: string[],
  ): Promise<void> {
    const project = await this.projectRepository.repository.findOne({
      where: { id: projectId },
      relations: ['property', 'property.customer'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const isCustomer = project.property?.customer?.userId === userId;
    const isTeamMember = await this.teamRepository.isTeamMember(userId, projectId);
    const isAdmin = hasAdminBypassRole(roles);

    if (!isCustomer && !isTeamMember && !isAdmin) {
      throw new ForbiddenException('You are not authorized to access this project chat');
    }
  }

  /**
   * Retrieve all messages in the project chat
   */
  async getMessages(
    projectId: string,
    userId: string,
    roles: string[],
  ): Promise<ProjectChatMessageEntity[]> {
    await this.validateChatAccess(projectId, userId, roles);
    return this.chatRepository.findByProject(projectId);
  }

  /**
   * Post a new message in the project chat
   */
  async sendMessage(
    projectId: string,
    userId: string,
    roles: string[],
    messageText: string,
  ): Promise<ProjectChatMessageEntity> {
    await this.validateChatAccess(projectId, userId, roles);
    return this.chatRepository.create({
      projectId,
      senderId: userId,
      messageText,
    });
  }
}

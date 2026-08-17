import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { canViewAllProjects, hasAdminBypassRole } from '../../iam/constants';
import {
  CONSUMER_EVENTS,
  ChatMessageEvent,
} from '../../notifications/events/consumer-notification.events';
import { ProjectChatMessageEntity } from '../entities/project-chat-message.entity';
import { ProjectChatRepository } from '../repositories/project-chat.repository';
import { ProjectTeamRepository } from '../repositories/project-team.repository';
import { ProjectRepository } from '../repositories/project.repository';

@Injectable()
export class ProjectChatService {
  private readonly logger = new Logger(ProjectChatService.name);

  constructor(
    private readonly chatRepository: ProjectChatRepository,
    private readonly teamRepository: ProjectTeamRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Validate that the user has permission to access the chat of a project.
   * Reads: customer, team, admin, or `projects.view`.
   * Writes: customer, team, or admin — `projects.view` is not a post grant.
   */
  private async validateChatAccess(
    projectId: string,
    userId: string,
    roles: string[],
    permissions: string[] = [],
    access: 'read' | 'write' = 'read',
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
    const orgWide =
      access === 'read' ? canViewAllProjects(roles, permissions) : hasAdminBypassRole(roles);

    if (!isCustomer && !isTeamMember && !orgWide) {
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
    permissions: string[] = [],
  ): Promise<ProjectChatMessageEntity[]> {
    await this.validateChatAccess(projectId, userId, roles, permissions, 'read');
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
    permissions: string[] = [],
  ): Promise<ProjectChatMessageEntity> {
    await this.validateChatAccess(projectId, userId, roles, permissions, 'write');
    const message = await this.chatRepository.create({
      projectId,
      senderId: userId,
      messageText,
    });

    // Notify the consumer if the sender is NOT the customer (avoid self-notification)
    try {
      const project = await this.projectRepository.repository.findOne({
        where: { id: projectId },
        relations: ['property', 'property.customer'],
      });

      const customerUserId = project?.property?.customer?.userId;
      if (customerUserId && customerUserId !== userId && project?.property) {
        this.eventEmitter.emit(
          CONSUMER_EVENTS.CHAT_MESSAGE,
          new ChatMessageEvent(
            projectId,
            project.propertyId,
            message.id,
            userId,
            messageText.substring(0, 100),
          ),
        );
      }
    } catch (error) {
      this.logger.error('Failed to emit chat message notification event', error);
    }

    return message;
  }
}

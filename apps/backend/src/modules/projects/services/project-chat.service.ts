import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { hasAdminBypassRole } from '../../iam/constants';
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
            project.property.organizationId,
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

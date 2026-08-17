import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { SendChatMessageDto, ProjectChatMessageResponseDto } from '../dto/project-chat';
import { ProjectChatService } from '../services/project-chat.service';

@ApiTags('Project Chat')
@ApiBearerAuth()
@Controller('projects/:projectId/chat')
@UseGuards(JwtAuthGuard)
export class ProjectChatController {
  constructor(private readonly chatService: ProjectChatService) {}

  @Get()
  @ApiOperation({ summary: 'Get all chat messages for a project' })
  async getMessages(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<ProjectChatMessageResponseDto[]> {
    const messages = await this.chatService.getMessages(
      projectId,
      currentUser.id,
      currentUser.roles || [],
      currentUser.permissions || [],
    );

    return plainToInstance(ProjectChatMessageResponseDto, messages, {
      excludeExtraneousValues: true,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Send a new chat message' })
  async sendMessage(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: SendChatMessageDto,
  ): Promise<ProjectChatMessageResponseDto> {
    const message = await this.chatService.sendMessage(
      projectId,
      currentUser.id,
      currentUser.roles || [],
      dto.messageText,
      currentUser.permissions || [],
    );

    return plainToInstance(ProjectChatMessageResponseDto, message, {
      excludeExtraneousValues: true,
    });
  }
}

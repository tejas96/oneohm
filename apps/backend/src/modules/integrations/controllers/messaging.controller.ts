import { Body, Controller, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MessageType } from '@oneohm-epc/shared-types';
import { OrganizationContext } from '@oneohm-epc/shared-utils';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
import { PermissionGuard } from '../../iam/guards/permission.guard';
import { SendMessageDto, MessageResponseDto } from '../dto';
import { IntegrationService } from '../services';

/**
 * Messaging Controller
 * Handles messaging operations (auto-selects provider based on org config)
 * Uses a unified DTO for all message types
 *
 * Access: Users with 'messaging:send' permission
 */
@ApiTags('Messaging')
@ApiBearerAuth('JWT-auth')
@Controller('messaging')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class MessagingController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Post('send')
  @ApiOperation({
    summary: 'Send message',
    description:
      'Send any type of message (text, template, media, OTP, alert). The system automatically uses the active messaging provider configured for your organization. Requires messaging:send permission.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Message sent successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No active messaging integration found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid message data or missing required fields',
  })
  async sendMessage(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    // Route to appropriate service method based on message type
    const messageType: MessageType = dto.type;
    switch (messageType) {
      case MessageType.TEXT:
        return this.integrationService.sendTextMessage(organizationId, {
          to: dto.to,
          type: MessageType.TEXT,
          body: dto.body!,
          metadata: dto.metadata,
        });

      case MessageType.TEMPLATE:
        return this.integrationService.sendTemplateMessage(organizationId, {
          to: dto.to,
          type: MessageType.TEMPLATE,
          templateName: dto.templateName!,
          templateLanguage: dto.templateLanguage,
          templateParameters: dto.templateParameters,
          metadata: dto.metadata,
        });

      case MessageType.IMAGE:
      case MessageType.DOCUMENT:
      case MessageType.VIDEO:
      case MessageType.AUDIO:
        return this.integrationService.sendMediaMessage(organizationId, {
          to: dto.to,
          type: messageType,
          mediaUrl: dto.mediaUrl,
          mediaId: dto.mediaId,
          caption: dto.caption,
          filename: dto.filename,
          metadata: dto.metadata,
        });

      case MessageType.OTP:
        return this.integrationService.sendOtpMessage(organizationId, {
          to: dto.to,
          type: MessageType.OTP,
          otp: dto.otp!,
          expiryMinutes: dto.expiryMinutes,
          metadata: dto.metadata,
        });

      case MessageType.ALERT:
        return this.integrationService.sendAlertMessage(organizationId, {
          to: dto.to,
          type: MessageType.ALERT,
          body: dto.body!,
          title: dto.title,
          priority: dto.priority,
          metadata: dto.metadata,
        });

      case MessageType.LOCATION:
      case MessageType.CONTACT:
      case MessageType.NOTIFICATION:
        throw new Error(`Message type ${messageType} is not yet implemented`);

      default:
        throw new Error(`Unsupported message type: ${String(messageType)}`);
    }
  }
}

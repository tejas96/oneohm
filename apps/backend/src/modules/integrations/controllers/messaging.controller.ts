import {
  BadRequestException,
  Body,
  Controller,
  HttpStatus,
  NotImplementedException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MessageType } from '@tejas96/shared/types';

import { OrganizationContext } from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
import { SendMessageDto, MessageResponseDto } from '../dto';
import { IntegrationService } from '../services';

@ApiTags('Messaging')
@ApiBearerAuth()
@Controller('messaging')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send message' })
  @ApiResponse({ status: HttpStatus.OK, type: MessageResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No active messaging integration found',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid message data' })
  async sendMessage(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
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
        throw new NotImplementedException(`Message type ${messageType} is not yet implemented`);

      default:
        throw new BadRequestException(`Unsupported message type: ${String(messageType)}`);
    }
  }
}

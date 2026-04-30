import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

import { OrganizationContext } from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { PermissionGuard } from '../../iam/guards/permission.guard';
import { NotificationResponseDto } from '../dto/notification-response.dto';
import { NotificationService } from '../services/notification.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Get unread count — MUST be before :id
   */
  @RequirePermission('notifications:read')
  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count for current user' })
  async getUnreadCount(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<{ count: number }> {
    const count = await this.notificationService.getUnreadCount(currentUser.id, organizationId);
    return { count };
  }

  /**
   * Mark all notifications as read
   */
  @RequirePermission('notifications:read')
  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  async markAllRead(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<{ message: string }> {
    await this.notificationService.markAllRead(currentUser.id, organizationId);
    return { message: 'All notifications marked as read' };
  }

  /**
   * Get all notifications for current user
   */
  @RequirePermission('notifications:read')
  @Get()
  @ApiOperation({ summary: 'Get notifications for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  async findAll(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('unreadOnly') unreadOnly?: boolean,
  ): Promise<{
    data: NotificationResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { notifications, total } = await this.notificationService.list(
      currentUser.id,
      organizationId,
      page,
      limit,
      unreadOnly,
    );

    const pageNum = page ?? 1;
    const limitNum = limit ?? 20;
    return {
      data: plainToInstance(NotificationResponseDto, notifications, {
        excludeExtraneousValues: true,
      }),
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };
  }

  /**
   * Mark notification as read
   */
  @RequirePermission('notifications:read')
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markRead(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.notificationService.markRead(id, currentUser.id);
    return { message: 'Notification marked as read' };
  }
}

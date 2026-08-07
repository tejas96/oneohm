import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FollowupStatus, type PaginatedResponse } from '@tejas96/shared/types';

import {
  ApiAction,
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate
} from '../../../common/decorators';
import { toDto, toPaginatedResponse } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
import { CreateFollowupDto } from '../dto/create-followup.dto';
import { FollowupResponseDto } from '../dto/followup-response.dto';
import { UpdateFollowupDto } from '../dto/update-followup.dto';
import { FollowupService } from '../services/followup.service';

/**
 * Followup Controller
 * Handles HTTP requests for followup management
 */
@ApiTags('Followups')
@ApiBearerAuth()
@Controller('followups')
@UseGuards(JwtAuthGuard)
export class FollowupController {
  constructor(private readonly followupService: FollowupService) {}

  /**
   * Create a new followup
   */
  @ApiCreate({
    summary: 'Create a new followup',
    description: 'Create a followup for a customer or property. Property ID is optional.',
    responseType: FollowupResponseDto,
  })
  async create(
    @Body() createDto: CreateFollowupDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<FollowupResponseDto> {
    const followup = await this.followupService.create(createDto, currentUser.id);
    return toDto(FollowupResponseDto, followup);
  }

  /**
   * Get all followups with filters
   */
  @ApiReadAll({
    summary: 'List all followups',
    description:
      'Get all followups with optional filters (status, assignee, customer, property, date range)',
    responseType: FollowupResponseDto,
  })
  @ApiQuery({ name: 'status', required: false, enum: FollowupStatus })
  @ApiQuery({ name: 'assignedToUserId', required: false, type: String })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'propertyId', required: false, type: String })
  @ApiQuery({ name: 'priority', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('status') status?: FollowupStatus,
    @Query('assignedToUserId') assignedToUserId?: string,
    @Query('customerId', new ParseUUIDPipe({ optional: true })) customerId?: string,
    @Query('propertyId', new ParseUUIDPipe({ optional: true })) propertyId?: string,
    @Query('priority') priority?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ): Promise<PaginatedResponse<FollowupResponseDto>> {
    const hasFilters =
      status || assignedToUserId || customerId || propertyId || priority || from || to;

    if (hasFilters) {
      const result = await this.followupService.findWithFilters(
        { status, assignedToUserId, customerId, propertyId, priority, from, to },
        page,
        limit,
      );
      return toPaginatedResponse(FollowupResponseDto, result.data, result.total, page, limit);
    }

    const result = await this.followupService.findAll(page, limit);
    return toPaginatedResponse(FollowupResponseDto, result.data, result.total, page, limit);
  }

  /**
   * Get followups assigned to current user
   */
  @Get('my')
  @ApiReadAll({
    summary: 'Get my followups',
    description: 'Get followups assigned to the current user',
    responseType: FollowupResponseDto,
  })
  @ApiQuery({ name: 'status', required: false, enum: FollowupStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findMyFollowups(
    @CurrentUser() currentUser: CurrentUserType,
    @Query('status') status?: FollowupStatus,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ): Promise<PaginatedResponse<FollowupResponseDto>> {
    const result = await this.followupService.findMyFollowups(
      currentUser.id,
      status,
      page,
      limit,
    );
    return toPaginatedResponse(FollowupResponseDto, result.data, result.total, page, limit);
  }

  /**
   * Get today's followups
   */
  @Get('today')
  @ApiReadAll({
    summary: "Get today's followups",
    description: 'Get pending followups scheduled for today',
    responseType: FollowupResponseDto,
  })
  @ApiQuery({
    name: 'assignedToUserId',
    required: false,
    type: String,
    description: 'Filter by assignee (optional)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findTodayFollowups(
    @Query('assignedToUserId') assignedToUserId?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ): Promise<PaginatedResponse<FollowupResponseDto>> {
    const result = await this.followupService.findTodayFollowups(
      assignedToUserId,
      page,
      limit,
    );
    return toPaginatedResponse(FollowupResponseDto, result.data, result.total, page, limit);
  }

  /**
   * Get overdue followups
   */
  @Get('overdue')
  @ApiReadAll({
    summary: 'Get overdue followups',
    description: 'Get pending followups that are past their scheduled date',
    responseType: FollowupResponseDto,
  })
  @ApiQuery({
    name: 'assignedToUserId',
    required: false,
    type: String,
    description: 'Filter by assignee (optional)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findOverdueFollowups(
    @Query('assignedToUserId') assignedToUserId?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ): Promise<PaginatedResponse<FollowupResponseDto>> {
    const result = await this.followupService.findOverdueFollowups(
      assignedToUserId,
      page,
      limit,
    );
    return toPaginatedResponse(FollowupResponseDto, result.data, result.total, page, limit);
  }

  /**
   * Get followup by ID
   */
  @ApiReadOne({
    summary: 'Get followup by ID',
    description: 'Get a specific followup by its ID',
    responseType: FollowupResponseDto,
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FollowupResponseDto> {
    const followup = await this.followupService.findById(id);
    return toDto(FollowupResponseDto, followup);
  }

  /**
   * Update followup
   */
  @ApiUpdate({
    summary: 'Update followup',
    description: 'Update followup details',
    responseType: FollowupResponseDto,
    method: 'PATCH',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateFollowupDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<FollowupResponseDto> {
    const followup = await this.followupService.update(
      id,
      updateDto,
      currentUser.id,
    );
    return toDto(FollowupResponseDto, followup);
  }

  /**
   * Mark followup as completed
   */
  @ApiAction({
    path: 'complete',
    summary: 'Mark followup as completed',
    description: 'Update followup status to completed',
    responseType: FollowupResponseDto,
  })
  async markAsCompleted(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<FollowupResponseDto> {
    const followup = await this.followupService.markAsCompleted(id, currentUser.id);
    return toDto(FollowupResponseDto, followup);
  }

  /**
   * Mark followup as cancelled
   */
  @ApiAction({
    path: 'cancel',
    summary: 'Mark followup as cancelled',
    description: 'Update followup status to cancelled',
    responseType: FollowupResponseDto,
  })
  async markAsCancelled(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<FollowupResponseDto> {
    const followup = await this.followupService.markAsCancelled(id, currentUser.id);
    return toDto(FollowupResponseDto, followup);
  }

  /**
   * Delete followup (soft delete)
   */
  @ApiDelete({
    summary: 'Delete followup',
    description: 'Soft delete a followup',
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<void> {
    await this.followupService.delete(id, currentUser.id);
  }
}

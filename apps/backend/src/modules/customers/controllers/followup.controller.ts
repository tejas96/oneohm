import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FollowupStatus, type PaginatedResponse } from '@tejas96/shared/types';

import {
  ApiAction,
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
} from '../../../common/decorators';
import { toDto, toPaginatedResponse } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
import { CompleteFollowupDto } from '../dto/complete-followup.dto';
import { CreateFollowupDto } from '../dto/create-followup.dto';
import { FollowupGapResponseDto } from '../dto/followup-gap-response.dto';
import { FollowupResponseDto } from '../dto/followup-response.dto';
import { FollowupSummaryResponseDto } from '../dto/followup-summary-response.dto';
import { ReassignFollowupDto, ReassignFollowupsBulkDto } from '../dto/reassign-followup.dto';
import { RescheduleFollowupDto } from '../dto/reschedule-followup.dto';
import { SiteWorkItemDto } from '../dto/site-work-item.dto';
import { UpdateFollowupDto } from '../dto/update-followup.dto';
import { FollowupService } from '../services/followup.service';
import { SiteWorkService } from '../services/site-work.service';

/**
 * Followup Controller
 * Handles HTTP requests for followup management
 */
@ApiTags('Followups')
@ApiBearerAuth()
@Controller('followups')
@UseGuards(JwtAuthGuard)
export class FollowupController {
  constructor(
    private readonly followupService: FollowupService,
    private readonly siteWorkService: SiteWorkService,
  ) {}

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
   * Open lead units with no pending followup — the safety net.
   *
   * Declared above any `:id` route, or Nest matches "gaps" as an id.
   */
  @Get('gaps')
  @ApiOperation({
    summary: 'Open lead units with no pending followup',
    description:
      'Records created by import or direct API call never pass through the UI gates, so anything that slipped appears here with a name against it.',
  })
  @ApiOkResponse({ type: [FollowupGapResponseDto] })
  async gaps(): Promise<FollowupGapResponseDto[]> {
    return this.followupService.gaps();
  }

  /**
   * Badge counts. Declared above any `:id` route for the same reason as gaps.
   */
  @Get('summary')
  @ApiOperation({ summary: 'Followup counts for the nav badge' })
  @ApiQuery({
    name: 'mine',
    required: false,
    type: Boolean,
    description: 'Defaults to true. Pass false for everyone’s followups.',
  })
  @ApiOkResponse({ type: FollowupSummaryResponseDto })
  async summary(
    @CurrentUser() currentUser: CurrentUserType,
    @Query('mine') mine?: string,
  ): Promise<FollowupSummaryResponseDto> {
    return this.followupService.summary(mine === 'false' ? null : currentUser.id);
  }

  /**
   * Reassign many followups at once — the handoff case.
   *
   * Above `:id` so "reassign" is not read as an id.
   */
  @Post('reassign')
  @ApiOperation({
    summary: 'Reassign many followups',
    description: 'Moves ownership of several leads at once. Any user may reassign to any user.',
  })
  async reassignMany(
    @Body() dto: ReassignFollowupsBulkDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<{ updated: number }> {
    return this.followupService.reassignMany(dto.ids, dto.assignedToUserId, currentUser.id);
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
    const result = await this.followupService.findMyFollowups(currentUser.id, status, page, limit);
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
    const result = await this.followupService.findTodayFollowups(assignedToUserId, page, limit);
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
    const result = await this.followupService.findOverdueFollowups(assignedToUserId, page, limit);
    return toPaginatedResponse(FollowupResponseDto, result.data, result.total, page, limit);
  }

  /**
   * The field rep's own site queue.
   *
   * Declared ABOVE the `:id` route on purpose: Nest matches in declaration
   * order, so below it `my-site-work` is read as an id and dies in the UUID
   * pipe. `/gaps` and `/summary` sit above it for the same reason.
   *
   * A bare array, not paginated, matching `/followups/gaps`. A rep has a day's
   * work, not a caseload, and the screen filters and counts over what it holds.
   */
  @Get('my-site-work')
  @ApiOperation({ summary: 'Site visits and surveys assigned to the current user' })
  @ApiOkResponse({ type: [SiteWorkItemDto] })
  async findMySiteWork(@CurrentUser() currentUser: CurrentUserType): Promise<SiteWorkItemDto[]> {
    return this.siteWorkService.findMine(currentUser.id);
  }

  /**
   * Get followup by ID
   */
  @ApiReadOne({
    summary: 'Get followup by ID',
    description: 'Get a specific followup by its ID',
    responseType: FollowupResponseDto,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<FollowupResponseDto> {
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
    const followup = await this.followupService.update(id, updateDto, currentUser.id);
    return toDto(FollowupResponseDto, followup);
  }

  /**
   * Complete a followup and open the next one
   */
  @ApiAction({
    path: 'complete',
    summary: 'Complete a followup',
    description:
      'Records the outcome and creates the next followup in one transaction. A next followup is required when this is the last pending one on the lead unit, unless terminal is set.',
    responseType: FollowupResponseDto,
  })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteFollowupDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<FollowupResponseDto> {
    const followup = await this.followupService.complete(id, dto, currentUser.id);
    return toDto(FollowupResponseDto, followup);
  }

  /**
   * Reassign a followup — how a lead changes hands
   */
  @ApiAction({
    path: 'reassign',
    summary: 'Reassign a followup',
    description:
      'Ownership of a lead is the assignee of its pending followup, so this moves the lead. No role restriction.',
    responseType: FollowupResponseDto,
  })
  async reassign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReassignFollowupDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<FollowupResponseDto> {
    const followup = await this.followupService.reassign(id, dto.assignedToUserId, currentUser.id);
    return toDto(FollowupResponseDto, followup);
  }

  /**
   * Reschedule without completing
   */
  @ApiAction({
    path: 'reschedule',
    summary: 'Reschedule a followup',
    description: 'Moves the date without completing it. No outcome, no new record.',
    responseType: FollowupResponseDto,
  })
  async reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleFollowupDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<FollowupResponseDto> {
    const followup = await this.followupService.reschedule(id, dto.scheduledAt, currentUser.id);
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

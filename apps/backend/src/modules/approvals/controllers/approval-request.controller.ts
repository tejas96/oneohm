import {
  Body,
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
import {
  type PaginatedResponse,
  type StatisticsResponse,
  ApprovalRequestStatus,
} from '@tejas96/shared/types';
import { plainToInstance } from 'class-transformer';

import {
  ApiCreate,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate
} from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  ApprovalActionDto,
  ApprovalRequestResponseDto,
  CreateApprovalRequestDto,
  UpdateApprovalRequestDto,
} from '../dto';
import { ApprovalRequestService } from '../services';

/**
 * Approval Request Controller
 * Handles HTTP requests for approval workflow requests
 */
@ApiTags('Approval Workflows')
@ApiBearerAuth()
@Controller('approval-requests')
@UseGuards(JwtAuthGuard)
export class ApprovalRequestController {
  constructor(private readonly requestService: ApprovalRequestService) {}

  /**
   * Create a new approval request
   */
  @Post()
  @ApiCreate({
    summary: 'Create approval request',
    description: 'Submit a new approval request',
    responseType: ApprovalRequestResponseDto,
  })
  async create(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateApprovalRequestDto,
  ): Promise<ApprovalRequestResponseDto> {
    const request = await this.requestService.create(createDto, currentUser.id);

    return plainToInstance(ApprovalRequestResponseDto, request, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all approval requests
   */
  @Get()
  @ApiReadAll({
    summary: 'Get all approval requests',
    description: 'Retrieve all approval requests with pagination and filters',
    responseType: ApprovalRequestResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ApprovalRequestStatus,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'referenceType',
    required: false,
    type: String,
    description: 'Filter by reference type',
  })
  @ApiQuery({
    name: 'templateId',
    required: false,
    type: String,
    description: 'Filter by template ID',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search in request number, title, description',
  })
  async findAll(
    @CurrentUser() currentUser: CurrentUserType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: ApprovalRequestStatus,
    @Query('referenceType') referenceType?: string,
    @Query('templateId') templateId?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<ApprovalRequestResponseDto>> {
    const { requests, total } = await this.requestService.findAll(
      page ?? 1,
      limit ?? 20,
      {
        status,
        referenceType,
        templateId,
        search,
      },
    );

    return {
      data: plainToInstance(ApprovalRequestResponseDto, requests, {
        excludeExtraneousValues: true,
      }),
      meta: {
        page: page ?? 1,
        limit: limit ?? 20,
        total,
        totalPages: Math.ceil(total / (limit ?? 20)),
      },
    };
  }

  /**
   * Get approval request by ID
   */
  @Get(':id')
  @ApiReadOne({
    summary: 'Get approval request by ID',
    description: 'Retrieve a single approval request with full history',
    responseType: ApprovalRequestResponseDto,
  })
  async findOne(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApprovalRequestResponseDto> {
    const request = await this.requestService.findById(id);

    return plainToInstance(ApprovalRequestResponseDto, request, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get pending requests for current user
   */
  @Get('pending/my-requests')
  @ApiOperation({
    summary: 'Get my pending approvals',
    description: 'Get requests pending approval by current user',
  })
  async getMyPendingApprovals(
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<ApprovalRequestResponseDto[]> {
    const requests = await this.requestService.findPendingForUser(currentUser.id);

    return plainToInstance(ApprovalRequestResponseDto, requests, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Process approval action (approve/reject)
   */
  @Post(':id/action')
  @ApiOperation({
    summary: 'Process approval action',
    description: 'Approve or reject an approval request',
  })
  async processAction(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() actionDto: ApprovalActionDto,
  ): Promise<ApprovalRequestResponseDto> {
    const request = await this.requestService.processAction(
      id,
      actionDto,
      currentUser.id,
      currentUser.roles[0] ?? '', // Use first role
    );

    return plainToInstance(ApprovalRequestResponseDto, request, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update approval request
   */
  @Patch(':id')
  @ApiUpdate({
    summary: 'Update approval request',
    description: 'Update an approval request details',
    responseType: ApprovalRequestResponseDto,
  })
  async update(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateApprovalRequestDto,
  ): Promise<ApprovalRequestResponseDto> {
    const request = await this.requestService.update(id, updateDto, currentUser.id);

    return plainToInstance(ApprovalRequestResponseDto, request, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Cancel approval request
   */
  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel approval request',
    description: 'Cancel a pending approval request',
  })
  async cancel(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason?: string,
  ): Promise<ApprovalRequestResponseDto> {
    const request = await this.requestService.cancel(id, currentUser.id, reason);

    return plainToInstance(ApprovalRequestResponseDto, request, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get approval request statistics
   */
  @Get('stats/summary')
  @ApiOperation({
    summary: 'Get approval request statistics',
    description: 'Get approval request statistics by status',
  })
  async getStatistics(
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<StatisticsResponse<ApprovalRequestStatus>> {
    return this.requestService.getStatistics();
  }

  /**
   * Get pending count
   */
  @Get('stats/pending-count')
  @ApiOperation({
    summary: 'Get pending count',
    description: 'Get count of pending approval requests',
  })
  async getPendingCount(
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<{ count: number }> {
    const count = await this.requestService.getPendingCount();
    return { count };
  }
}

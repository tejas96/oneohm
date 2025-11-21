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
  type CurrentUserType,
  CurrentUser,
  JwtAuthGuard,
  Role,
  Roles,
  RolesGuard,
} from '@oneohm-epc/shared-auth';
import {
  type PaginatedResponse,
  type StatisticsResponse,
  ApprovalRequestStatus,
} from '@oneohm-epc/shared-types';
import { ApiCreate, ApiReadAll, ApiReadOne, ApiUpdate,
  OrganizationContext} from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

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
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApprovalRequestController {
  constructor(private readonly requestService: ApprovalRequestService) {}

  /**
   * Create a new approval request
   */
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiCreate({
    summary: 'Create approval request',
    description: 'Submit a new approval request',
    responseType: ApprovalRequestResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES],
  })
  async create(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateApprovalRequestDto,
  ): Promise<ApprovalRequestResponseDto> {
    const request = await this.requestService.create(
      organizationId,
      createDto,
      currentUser.id,
    );

    return plainToInstance(ApprovalRequestResponseDto, request, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all approval requests
   */
  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiReadAll({
    summary: 'Get all approval requests',
    description: 'Retrieve all approval requests with pagination and filters',
    responseType: ApprovalRequestResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES],
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
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: ApprovalRequestStatus,
    @Query('referenceType') referenceType?: string,
    @Query('templateId') templateId?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<ApprovalRequestResponseDto>> {
    const { requests, total } = await this.requestService.findAll(
      organizationId,
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
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiReadOne({
    summary: 'Get approval request by ID',
    description: 'Retrieve a single approval request with full history',
    responseType: ApprovalRequestResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES],
  })
  async findOne(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApprovalRequestResponseDto> {
    const request = await this.requestService.findById(id, organizationId);

    return plainToInstance(ApprovalRequestResponseDto, request, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get pending requests for current user
   */
  @Get('pending/my-requests')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({
    summary: 'Get my pending approvals',
    description: 'Get requests pending approval by current user',
  })
  async getMyPendingApprovals(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<ApprovalRequestResponseDto[]> {
    const requests = await this.requestService.findPendingForUser(
      currentUser.id,
      organizationId,
    );

    return plainToInstance(ApprovalRequestResponseDto, requests, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Process approval action (approve/reject)
   */
  @Post(':id/action')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({
    summary: 'Process approval action',
    description: 'Approve or reject an approval request',
  })
  async processAction(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() actionDto: ApprovalActionDto,
  ): Promise<ApprovalRequestResponseDto> {
    const request = await this.requestService.processAction(
      id,
      organizationId,
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
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiUpdate({
    summary: 'Update approval request',
    description: 'Update an approval request details',
    responseType: ApprovalRequestResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
  })
  async update(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateApprovalRequestDto,
  ): Promise<ApprovalRequestResponseDto> {
    const request = await this.requestService.update(
      id,
      organizationId,
      updateDto,
      currentUser.id,
    );

    return plainToInstance(ApprovalRequestResponseDto, request, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Cancel approval request
   */
  @Post(':id/cancel')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Cancel approval request',
    description: 'Cancel a pending approval request',
  })
  async cancel(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason?: string,
  ): Promise<ApprovalRequestResponseDto> {
    const request = await this.requestService.cancel(
      id,
      organizationId,
      currentUser.id,
      reason,
    );

    return plainToInstance(ApprovalRequestResponseDto, request, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get approval request statistics
   */
  @Get('stats/summary')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Get approval request statistics',
    description: 'Get approval request statistics by status',
  })
  async getStatistics(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<StatisticsResponse<ApprovalRequestStatus>> {
    return this.requestService.getStatistics(organizationId);
  }

  /**
   * Get pending count
   */
  @Get('stats/pending-count')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Get pending count',
    description: 'Get count of pending approval requests',
  })
  async getPendingCount(@OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType): Promise<{ count: number }> {
    const count = await this.requestService.getPendingCount(organizationId);
    return { count };
  }
}

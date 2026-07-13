import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { type PaginatedResponse, ProjectPriority, ProjectStatus } from '@tejas96/shared/types';
import { plainToInstance } from 'class-transformer';

import {
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
  OrganizationContext,
} from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { hasAdminBypassRole } from '../../iam/constants';
import {
  ConvertFromQuoteDto,
  ProjectResponseDto,
  UpdateProjectDto,
  UpdateProjectStatusDto,
} from '../dto';
import { TeamMemberResponseDto, SubmitTeamFeedbackDto } from '../dto/project-team';
import { ProjectListItemDto } from '../dto/projects/project-list-item.dto';
import { ProjectRepository } from '../repositories';
import { ProjectTeamService } from '../services/project-team.service';
import { ProjectService } from '../services/project.service';

/**
 * Project Controller
 * Handles HTTP requests for project management
 *
 * Business Rule: One property can have only one project (OneToOne relationship)
 */
@ApiTags('Projects & Installation')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly teamService: ProjectTeamService,
    private readonly projectRepository: ProjectRepository,
  ) {}

  /**
   * Get all projects with filters
   */
  @Get()
  @ApiReadAll({
    summary: 'Get all projects',
    description: 'Retrieve all projects with optional filters and pagination',
    responseType: ProjectResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 20,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: Object.values(ProjectStatus),
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: Object.values(ProjectPriority),
    description: 'Filter by priority',
  })
  @ApiQuery({
    name: 'customerId',
    required: false,
    type: String,
    description: 'Filter by customer ID',
  })
  @ApiQuery({
    name: 'projectType',
    required: false,
    type: String,
    description: 'Filter by project type',
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    type: String,
    description: 'Filter by start date (from)',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    type: String,
    description: 'Filter by end date (to)',
  })
  @ApiQuery({
    name: 'startDateFrom',
    required: false,
    type: String,
    description: 'Filter by project start date (from, inclusive)',
  })
  @ApiQuery({
    name: 'startDateTo',
    required: false,
    type: String,
    description: 'Filter by project start date (to, inclusive)',
  })
  @ApiQuery({
    name: 'endDateFrom',
    required: false,
    type: String,
    description: 'Filter by project due date (from, inclusive)',
  })
  @ApiQuery({
    name: 'endDateTo',
    required: false,
    type: String,
    description: 'Filter by project due date (to, inclusive)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by project number or name',
  })
  @ApiQuery({
    name: 'memberId',
    required: false,
    type: String,
    description: 'Filter by team member (user ID)',
  })
  @ApiQuery({
    name: 'pendingWorkflowStepId',
    required: false,
    type: String,
    description: 'Filter by pending workflow step task',
  })
  @ApiQuery({
    name: 'healthStatus',
    required: false,
    enum: ['delayed', 'at_risk'],
    description: 'Filter by computed health status (overdue or at-risk projects)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    enum: [
      'name',
      'createdAt',
      'startDate',
      'endDate',
      'systemSizeKw',
      'estimatedCost',
      'progressPercentage',
      'status',
      'smartSort',
    ],
    description: 'Sort field',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  async findAll(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: ProjectStatus,
    @Query('priority') priority?: ProjectPriority,
    @Query('customerId', new ParseUUIDPipe({ optional: true })) customerId?: string,
    @Query('projectType') projectType?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('startDateFrom') startDateFrom?: string,
    @Query('startDateTo') startDateTo?: string,
    @Query('endDateFrom') endDateFrom?: string,
    @Query('endDateTo') endDateTo?: string,
    @Query('search') search?: string,
    @Query('memberId', new ParseUUIDPipe({ optional: true })) memberId?: string,
    @Query('pendingWorkflowStepId', new ParseUUIDPipe({ optional: true }))
    pendingWorkflowStepId?: string,
    @Query('healthStatus') healthStatusRaw?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<PaginatedResponse<ProjectListItemDto>> {
    const pageNum = Math.max(1, page ? parseInt(page, 10) || 1 : 1);
    const limitNum = Math.min(100, Math.max(1, limit ? parseInt(limit, 10) || 20 : 20));

    // Validate healthStatus to only accept known values
    const healthStatus =
      healthStatusRaw === 'delayed' || healthStatusRaw === 'at_risk' ? healthStatusRaw : undefined;

    const isAdmin = hasAdminBypassRole(currentUser.roles || []);
    const effectiveMemberId = isAdmin ? memberId : currentUser.id;

    const result = await this.projectService.findAll(organizationId, pageNum, limitNum, {
      status,
      priority,
      customerId,
      projectType,
      fromDate,
      toDate,
      startDateFrom,
      startDateTo,
      endDateFrom,
      endDateTo,
      search,
      memberId: effectiveMemberId,
      currentUserId: currentUser.id,
      pendingWorkflowStepId,
      healthStatus,
      sortBy,
      sortOrder,
    });

    return {
      data: plainToInstance(ProjectListItemDto, result.projects, {
        excludeExtraneousValues: true,
      }),
      meta: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum),
      },
    };
  }

  /**
   * Get team workload across all projects in the organization.
   * Returns per-user: active project count, total tasks, in-progress tasks, not-completed tasks.
   * NOTE: Must be defined before :id route.
   */
  @Get('team/workload')
  @ApiOperation({
    summary: 'Get team workload summary',
    description:
      'Returns per-user workload metrics across all projects for team assignment decisions',
  })
  async getTeamWorkload(@OrganizationContext() organizationId: string): Promise<
    Array<{
      userId: string;
      firstName: string;
      lastName: string;
      activeProjectCount: number;
      totalTaskCount: number;
      inProgressTaskCount: number;
      notCompletedTaskCount: number;
    }>
  > {
    return this.teamService.getUserWorkloads(organizationId);
  }

  /**
   * Get projects by customer
   * NOTE: Must be defined before :id route to avoid NestJS treating "customer" as a UUID
   */
  @Get('customer/:customerId')
  @ApiOperation({
    summary: 'Get projects by customer',
    description: 'Retrieve all projects for a specific customer',
  })
  async findByCustomer(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ): Promise<ProjectResponseDto[]> {
    const projects = await this.projectService.findByCustomer(customerId, organizationId);

    return plainToInstance(ProjectResponseDto, projects, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Convert quote to project (only creation path)
   * NOTE: Must be defined before :id route to avoid NestJS treating "convert-from-quote" as a UUID
   */
  @Post('convert-from-quote/:quoteId')
  @ApiOperation({
    summary: 'Convert quote to project',
    description:
      'Create a new project from an approved/accepted quote. Note: One property can only have one project.',
  })
  async convertFromQuote(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
    @Body() convertDto?: ConvertFromQuoteDto,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectService.convertFromQuote(
      quoteId,
      organizationId,
      currentUser.id,
      convertDto,
    );

    return plainToInstance(ProjectResponseDto, project, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get project by ID
   */
  @Get(':id')
  @ApiReadOne({
    summary: 'Get project by ID',
    description: 'Retrieve a single project with all relations',
    responseType: ProjectResponseDto,
  })
  async findOne(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectService.findById(id, organizationId);

    return plainToInstance(ProjectResponseDto, project, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update a project
   */
  @Patch(':id')
  @ApiUpdate({
    summary: 'Update a project',
    description: 'Update project details',
    responseType: ProjectResponseDto,
  })
  async update(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectService.update(id, organizationId, updateDto, currentUser.id);

    return plainToInstance(ProjectResponseDto, project, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Delete a project
   */
  @Delete(':id')
  @ApiDelete({
    summary: 'Delete a project',
    description: 'Soft delete a project (only draft/cancelled)',
  })
  async delete(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.projectService.delete(id, organizationId);
    return { message: 'Project deleted successfully' };
  }

  /**
   * Update project status
   */
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update project status',
    description: 'Change project status with validation',
  })
  async updateStatus(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateProjectStatusDto,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectService.updateStatus(id, organizationId, statusDto.status);

    return plainToInstance(ProjectResponseDto, project, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get project timeline data for Gantt visualization
   */
  @Get(':id/timeline')
  @ApiOperation({
    summary: 'Get project timeline',
    description: 'Retrieve timeline data including tasks and milestones for Gantt visualization',
  })
  async getTimeline(
    @OrganizationContext() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReturnType<typeof this.projectService.getProjectTimeline>> {
    return this.projectService.getProjectTimeline(id, organizationId);
  }

  /**
   * Get project progress statistics
   */
  @Get(':id/progress')
  @ApiOperation({
    summary: 'Get project progress',
    description: 'Retrieve progress statistics including task counts by status and overdue tasks',
  })
  async getProgress(
    @OrganizationContext() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReturnType<typeof this.projectService.getProjectProgress>> {
    return this.projectService.getProjectProgress(id, organizationId);
  }

  /**
   * Sync (rebuild) the project BOM from the quote calculation snapshot.
   * Idempotent: replaces any existing project BOM.
   */
  @Post(':id/sync-bom')
  @ApiOperation({
    summary: 'Sync project BOM from quote snapshot',
    description:
      'Rebuilds the project BOM from the linked quote calculation snapshot. Use when BOM is missing or outdated.',
  })
  async syncBom(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.projectService.syncBomFromSnapshot(organizationId, id, currentUser.id);
    return { message: 'BOM synced successfully' };
  }

  /**
   * Get project team for customer
   */
  @Get(':id/customer-team')
  @ApiOperation({
    summary: 'Get project team for customer',
    description: 'Retrieve project team members for customer bypass, checking customer ownership',
  })
  async getCustomerTeam(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<TeamMemberResponseDto[]> {
    const project = await this.projectRepository.repository.findOne({
      where: { id },
      relations: ['property', 'property.customer'],
    });

    const isCustomer = project?.property?.customer?.userId === currentUser.id;
    const isSharedAdmin = hasAdminBypassRole(currentUser.roles || []);

    if (!project || (!isCustomer && !isSharedAdmin)) {
      throw new ForbiddenException('You are not the customer of this project');
    }

    const members = await this.teamService.getTeamMembers(id);

    return plainToInstance(TeamMemberResponseDto, members, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Submit feedback for a project team member
   */
  @Post(':id/team/feedback')
  @ApiOperation({
    summary: 'Submit feedback for a project team member',
    description: 'Allows project customer to rate and review an assigned team member',
  })
  async submitFeedback(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: SubmitTeamFeedbackDto,
  ): Promise<{ success: boolean }> {
    await this.teamService.submitFeedback(
      id,
      dto.memberId,
      currentUser.id,
      currentUser.roles || [],
      dto.rating,
      dto.comment,
    );
    return { success: true };
  }
}

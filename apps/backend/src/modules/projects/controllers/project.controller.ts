import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { type PaginatedResponse, ProjectPriority, ProjectStatus } from '@oneohm-epc/shared-types';
import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
  OrganizationContext,
} from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { CreateProjectDto, ProjectResponseDto, UpdateProjectDto } from '../dto';
import { ProjectListItemDto } from '../dto/projects/project-list-item.dto';
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
  constructor(private readonly projectService: ProjectService) {}

  /**
   * Create a new project
   */
  @Post()
  @ApiCreate({
    summary: 'Create a new project',
    description:
      'Creates a new solar installation project. Note: One property can only have one project.',
    responseType: ProjectResponseDto,
  })
  async create(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectService.create(organizationId, createDto, currentUser.id);

    return plainToInstance(ProjectResponseDto, project, {
      excludeExtraneousValues: true,
    });
  }

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
    name: 'search',
    required: false,
    type: String,
    description: 'Search by project number or name',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    enum: ['name', 'createdAt', 'endDate', 'systemSizeKw', 'estimatedCost', 'progressPercentage', 'status'],
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
    @Query('customerId') customerId?: string,
    @Query('projectType') projectType?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<PaginatedResponse<ProjectListItemDto>> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    const result = await this.projectService.findAll(organizationId, pageNum, limitNum, {
      status,
      priority,
      customerId,
      projectType,
      fromDate,
      toDate,
      search,
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
  @ApiQuery({
    name: 'status',
    required: true,
    enum: Object.values(ProjectStatus),
    description: 'New status',
  })
  async updateStatus(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status: ProjectStatus,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectService.updateStatus(id, organizationId, status);

    return plainToInstance(ProjectResponseDto, project, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get projects by customer
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
   * Convert quote to project
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
  ): Promise<ProjectResponseDto> {
    const project = await this.projectService.convertFromQuote(
      quoteId,
      organizationId,
      currentUser.id,
    );

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
}

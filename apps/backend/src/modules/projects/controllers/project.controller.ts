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
import {
  type CurrentUserType,
  CurrentUser,
  JwtAuthGuard,
  Role,
  Roles,
  RolesGuard,
} from '@oneohm-epc/shared-auth';
import { type PaginatedResponse, ProjectPriority, ProjectStatus } from '@oneohm-epc/shared-types';
import { ApiCreate, ApiDelete, ApiReadAll, ApiReadOne, ApiUpdate } from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import { CreateProjectDto, ProjectResponseDto, UpdateProjectDto } from '../dto';
import { ProjectService } from '../services/project.service';

/**
 * Project Controller
 * Handles HTTP requests for project management
 */
@ApiTags('Projects & Installation')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  /**
   * Create a new project
   */
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiCreate({
    summary: 'Create a new project',
    description: 'Creates a new solar installation project',
    responseType: ProjectResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
  })
  async create(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectService.create(
      currentUser.organizationId,
      createDto,
      currentUser.id,
    );

    return plainToInstance(ProjectResponseDto, project, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all projects with filters
   */
  @Get()
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.MANAGER,
    Role.SALES,
    Role.FIELD_WORKER,
    Role.EXECUTION_ENGINEER,
  )
  @ApiReadAll({
    summary: 'Get all projects',
    description: 'Retrieve all projects with optional filters and pagination',
    responseType: ProjectResponseDto,
    roles: [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.MANAGER,
      Role.SALES,
      Role.FIELD_WORKER,
      Role.EXECUTION_ENGINEER,
    ],
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
    name: 'projectManagerId',
    required: false,
    type: String,
    description: 'Filter by project manager ID',
  })
  @ApiQuery({
    name: 'quoteId',
    required: false,
    type: String,
    description: 'Filter by quote ID',
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
  async findAll(
    @CurrentUser() currentUser: CurrentUserType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: ProjectStatus,
    @Query('priority') priority?: ProjectPriority,
    @Query('customerId') customerId?: string,
    @Query('projectManagerId') projectManagerId?: string,
    @Query('quoteId') quoteId?: string,
    @Query('projectType') projectType?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<ProjectResponseDto>> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    const result = await this.projectService.findAll(
      currentUser.organizationId,
      pageNum,
      limitNum,
      {
        status,
        priority,
        customerId,
        projectManagerId,
        quoteId,
        projectType,
        fromDate,
        toDate,
        search,
      },
    );

    return {
      data: plainToInstance(ProjectResponseDto, result.projects, {
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
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.MANAGER,
    Role.SALES,
    Role.FIELD_WORKER,
    Role.EXECUTION_ENGINEER,
  )
  @ApiReadOne({
    summary: 'Get project by ID',
    description: 'Retrieve a single project with all relations',
    responseType: ProjectResponseDto,
    roles: [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.MANAGER,
      Role.SALES,
      Role.FIELD_WORKER,
      Role.EXECUTION_ENGINEER,
    ],
  })
  async findOne(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectService.findById(id, currentUser.organizationId);

    return plainToInstance(ProjectResponseDto, project, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update a project
   */
  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiUpdate({
    summary: 'Update a project',
    description: 'Update project details',
    responseType: ProjectResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
  })
  async update(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectService.update(id, currentUser.organizationId, updateDto);

    return plainToInstance(ProjectResponseDto, project, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Delete a project
   */
  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiDelete({
    summary: 'Delete a project',
    description: 'Soft delete a project (only draft/cancelled)',
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async delete(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.projectService.delete(id, currentUser.organizationId);
    return { message: 'Project deleted successfully' };
  }

  /**
   * Update project status
   */
  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
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
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status: ProjectStatus,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectService.updateStatus(id, currentUser.organizationId, status);

    return plainToInstance(ProjectResponseDto, project, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get projects by customer
   */
  @Get('customer/:customerId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({
    summary: 'Get projects by customer',
    description: 'Retrieve all projects for a specific customer',
  })
  async findByCustomer(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ): Promise<ProjectResponseDto[]> {
    const projects = await this.projectService.findByCustomer(
      customerId,
      currentUser.organizationId,
    );

    return plainToInstance(ProjectResponseDto, projects, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Convert quote to project
   */
  @Post('convert-from-quote/:quoteId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Convert quote to project',
    description: 'Create a new project from an approved/accepted quote',
  })
  async convertFromQuote(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectService.convertFromQuote(
      quoteId,
      currentUser.organizationId,
      currentUser.id,
    );

    return plainToInstance(ProjectResponseDto, project, {
      excludeExtraneousValues: true,
    });
  }
}

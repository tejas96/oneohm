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
import { MilestoneStatus, MilestoneType } from '@oneohm-epc/shared-types';
import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiUpdate,
  OrganizationContext,
} from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { CreateMilestoneDto, MilestoneResponseDto, UpdateMilestoneDto } from '../dto';
import { MilestoneService } from '../services/milestone.service';

/**
 * Milestone Controller
 * Handles HTTP requests for project milestone management
 */
@ApiTags('Projects & Installation')
@ApiBearerAuth()
@Controller('projects/:projectId/milestones')
@UseGuards(JwtAuthGuard)
export class MilestoneController {
  constructor(private readonly milestoneService: MilestoneService) {}

  /**
   * Create a new milestone
   */
  @Post()
  @ApiCreate({
    summary: 'Create a new milestone',
    description: 'Creates a new project milestone with dependencies',
    responseType: MilestoneResponseDto,
  })
  async create(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() createDto: CreateMilestoneDto,
  ): Promise<MilestoneResponseDto> {
    // Ensure projectId in path matches DTO
    createDto.projectId = projectId;

    const milestone = await this.milestoneService.create(organizationId, createDto);

    return plainToInstance(MilestoneResponseDto, milestone, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all milestones for a project
   */
  @Get()
  @ApiReadAll({
    summary: 'Get all milestones',
    description: 'Retrieve all milestones for a project with optional filters',
    responseType: MilestoneResponseDto,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: Object.values(MilestoneStatus),
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'milestoneType',
    required: false,
    enum: Object.values(MilestoneType),
    description: 'Filter by milestone type',
  })
  @ApiQuery({
    name: 'assignedTo',
    required: false,
    type: String,
    description: 'Filter by assigned user ID',
  })
  async findByProject(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('status') status?: MilestoneStatus,
    @Query('milestoneType') milestoneType?: MilestoneType,
    @Query('assignedTo') assignedTo?: string,
  ): Promise<MilestoneResponseDto[]> {
    const milestones = await this.milestoneService.findByProject(projectId, organizationId, {
      status,
      milestoneType,
      assignedTo,
    });

    return plainToInstance(MilestoneResponseDto, milestones, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get milestone by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get milestone by ID',
    description: 'Retrieve a single milestone with details',
  })
  async findOne(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MilestoneResponseDto> {
    const milestone = await this.milestoneService.findById(id, projectId, organizationId);

    return plainToInstance(MilestoneResponseDto, milestone, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update a milestone
   */
  @Patch(':id')
  @ApiUpdate({
    summary: 'Update a milestone',
    description: 'Update milestone details and progress',
    responseType: MilestoneResponseDto,
  })
  async update(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateMilestoneDto,
  ): Promise<MilestoneResponseDto> {
    const milestone = await this.milestoneService.update(id, projectId, organizationId, updateDto);

    return plainToInstance(MilestoneResponseDto, milestone, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Delete a milestone
   */
  @Delete(':id')
  @ApiDelete({
    summary: 'Delete a milestone',
    description: 'Delete a milestone (only pending/skipped)',
  })
  async delete(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.milestoneService.delete(id, projectId, organizationId);
    return { message: 'Milestone deleted successfully' };
  }

  /**
   * Update milestone status
   */
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update milestone status',
    description: 'Change milestone status with dependency validation',
  })
  @ApiQuery({
    name: 'status',
    required: true,
    enum: Object.values(MilestoneStatus),
    description: 'New status',
  })
  async updateStatus(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status: MilestoneStatus,
  ): Promise<MilestoneResponseDto> {
    const milestone = await this.milestoneService.updateStatus(
      id,
      projectId,
      organizationId,
      status,
    );

    return plainToInstance(MilestoneResponseDto, milestone, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update milestone progress
   */
  @Patch(':id/progress')
  @ApiOperation({
    summary: 'Update milestone progress',
    description: 'Update milestone progress percentage (0-100)',
  })
  @ApiQuery({
    name: 'progress',
    required: true,
    type: Number,
    description: 'Progress percentage (0-100)',
  })
  async updateProgress(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('progress') progress: string,
  ): Promise<MilestoneResponseDto> {
    const milestone = await this.milestoneService.updateProgress(
      id,
      projectId,
      organizationId,
      parseInt(progress, 10),
    );

    return plainToInstance(MilestoneResponseDto, milestone, {
      excludeExtraneousValues: true,
    });
  }
}

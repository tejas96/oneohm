import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  type PaginatedResponse,
  type StatisticsResponse,
  type TaskActivityEntry,
  TaskPriority,
  TaskStatus,
} from '@oneohm-epc/shared-types';
import { ApiCreate, ApiDelete, ApiReadAll, ApiReadOne, ApiUpdate, OrganizationContext } from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  CreateProjectTaskDto,
  MoveTaskDto,
  ProjectTaskResponseDto,
  UpdateProjectTaskDto,
} from '../dto';
import { ProjectTeamGuard } from '../guards';
import { ProjectTaskService } from '../services';

/**
 * Task Constants
 * Centralized configuration values for task operations
 */
const TASK_CONSTANTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  DEFAULT_KANBAN_LIMIT: 50,
  DEFAULT_ACTIVITY_LOG_LIMIT: 100,
  MAX_ACTIVITY_LOG_ENTRIES: 100,
} as const;

@ApiTags('Project Tasks')
@ApiBearerAuth()
@Controller('projects/:projectId/tasks')
@UseGuards(JwtAuthGuard, ProjectTeamGuard)
export class ProjectTaskController {
  constructor(private readonly taskService: ProjectTaskService) {}

  @Post()
  @ApiCreate({ responseType: ProjectTaskResponseDto, summary: 'Create a new project task' })
  async create(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() createDto: CreateProjectTaskDto,
  ): Promise<ProjectTaskResponseDto> {
    // Override projectId from route param
    createDto.projectId = projectId;

    const task = await this.taskService.create(createDto, currentUser.id);
    return plainToInstance(ProjectTaskResponseDto, task, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiReadAll({ responseType: ProjectTaskResponseDto, summary: 'Get all project tasks' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'milestoneId', required: false, type: String })
  @ApiQuery({ name: 'assignedToUserId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  @ApiQuery({ name: 'priority', required: false, enum: TaskPriority })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('page', new DefaultValuePipe(TASK_CONSTANTS.DEFAULT_PAGE), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(TASK_CONSTANTS.DEFAULT_LIMIT), ParseIntPipe) limit: number,
    @Query('milestoneId') milestoneId?: string,
    @Query('assignedToUserId') assignedToUserId?: string,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<ProjectTaskResponseDto>> {
    const result = await this.taskService.findAll(projectId, page, limit, {
      milestoneId,
      assignedToUserId,
      status,
      priority,
      search,
    });

    return {
      data: plainToInstance(ProjectTaskResponseDto, result.data, {
        excludeExtraneousValues: true,
      }),
      meta: result.meta,
    };
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get project task statistics' })
  async getStatistics(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<StatisticsResponse<TaskStatus>> {
    return this.taskService.getStatistics(projectId);
  }

  @Get('kanban')
  @ApiOperation({ summary: 'Get tasks for Kanban board by status' })
  @ApiQuery({ name: 'status', required: true, enum: TaskStatus })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiBadRequestResponse({ description: 'Invalid status value' })
  async getKanbanColumn(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('status') status: TaskStatus,
    @Query('page', new DefaultValuePipe(TASK_CONSTANTS.DEFAULT_PAGE), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(TASK_CONSTANTS.DEFAULT_KANBAN_LIMIT), ParseIntPipe)
    limit: number,
  ): Promise<PaginatedResponse<ProjectTaskResponseDto>> {
    const result = await this.taskService.getKanbanColumn(projectId, status, page, limit);

    return {
      data: plainToInstance(ProjectTaskResponseDto, result.data, {
        excludeExtraneousValues: true,
      }),
      meta: result.meta,
    };
  }

  @Post(':id/move')
  @ApiOperation({ summary: 'Move task to new status/position (Kanban drag-drop)' })
  @ApiBadRequestResponse({ description: 'Invalid input or dependencies not complete' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiConflictResponse({ description: 'Version mismatch - task was modified by another user' })
  async moveTask(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() moveDto: MoveTaskDto,
  ): Promise<ProjectTaskResponseDto> {
    const task = await this.taskService.moveTask(
      id,
      projectId,
      moveDto.status,
      moveDto.kanbanOrder,
      moveDto.version,
      currentUser.id,
    );

    return plainToInstance(ProjectTaskResponseDto, task, {
      excludeExtraneousValues: true,
    });
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue tasks' })
  async getOverdue(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ProjectTaskResponseDto[]> {
    const tasks = await this.taskService.getOverdueTasks(projectId);
    return plainToInstance(ProjectTaskResponseDto, tasks, {
      excludeExtraneousValues: true,
    });
  }

  @Get('milestone/:milestoneId')
  @ApiOperation({ summary: 'Get tasks by milestone' })
  async findByMilestone(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
  ): Promise<ProjectTaskResponseDto[]> {
    const tasks = await this.taskService.findByMilestone(projectId, milestoneId);
    return plainToInstance(ProjectTaskResponseDto, tasks, {
      excludeExtraneousValues: true,
    });
  }

  @Get('assignee/:assigneeId')
  @ApiOperation({ summary: 'Get tasks by assignee' })
  async findByAssignee(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('assigneeId', ParseUUIDPipe) assigneeId: string,
  ): Promise<ProjectTaskResponseDto[]> {
    const tasks = await this.taskService.findByAssignee(projectId, assigneeId);
    return plainToInstance(ProjectTaskResponseDto, tasks, {
      excludeExtraneousValues: true,
    });
  }

  @Get('generate-code')
  @ApiOperation({ summary: 'Generate next task code' })
  async generateCode(
    @OrganizationContext() organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<{ code: string }> {
    const code = await this.taskService.generateTaskCode(projectId, organizationId);
    return { code };
  }

  @Get(':id')
  @ApiReadOne({ responseType: ProjectTaskResponseDto, summary: 'Get project task by ID' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  async findOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectTaskResponseDto> {
    const task = await this.taskService.findById(id, projectId);
    return plainToInstance(ProjectTaskResponseDto, task, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @ApiUpdate({ responseType: ProjectTaskResponseDto, summary: 'Update project task' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiBadRequestResponse({ description: 'Invalid input or duplicate code' })
  async update(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateProjectTaskDto,
  ): Promise<ProjectTaskResponseDto> {
    const task = await this.taskService.update(id, projectId, updateDto, currentUser.id);
    return plainToInstance(ProjectTaskResponseDto, task, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update task status' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiBadRequestResponse({ description: 'Invalid status value' })
  async updateStatus(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: TaskStatus,
  ): Promise<ProjectTaskResponseDto> {
    const task = await this.taskService.updateStatus(id, projectId, status, currentUser.id);
    return plainToInstance(ProjectTaskResponseDto, task, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign task to user' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiBadRequestResponse({ description: 'Invalid user ID' })
  async assignTask(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('assignedToUserId', ParseUUIDPipe) assignedToUserId: string,
  ): Promise<ProjectTaskResponseDto> {
    const task = await this.taskService.assignTask(id, projectId, assignedToUserId, currentUser.id);
    return plainToInstance(ProjectTaskResponseDto, task, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id/progress')
  @ApiOperation({ summary: 'Update task progress' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiBadRequestResponse({ description: 'Invalid progress value (must be 0-100)' })
  async updateProgress(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('completionPercentage') completionPercentage: number,
  ): Promise<ProjectTaskResponseDto> {
    const task = await this.taskService.updateProgress(
      id,
      projectId,
      completionPercentage,
      currentUser.id,
    );
    return plainToInstance(ProjectTaskResponseDto, task, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id/activity-log')
  @ApiOperation({ summary: 'Get activity history for a task' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 100 })
  @ApiNotFoundResponse({ description: 'Task not found' })
  async getActivityLog(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new DefaultValuePipe(TASK_CONSTANTS.DEFAULT_ACTIVITY_LOG_LIMIT), ParseIntPipe)
    limit: number,
  ): Promise<TaskActivityEntry[]> {
    return this.taskService.getTaskActivityLog(id, projectId, limit);
  }

  @Delete(':id')
  @ApiDelete({
    summary: 'Delete project task',
    description: 'Soft delete a project task',
  })
  async remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.taskService.remove(id, projectId);
  }
}

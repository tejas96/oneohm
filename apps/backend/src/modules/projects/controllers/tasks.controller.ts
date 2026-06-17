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
  type DueDateFilter,
  type PaginatedResponse,
  TaskPriority,
  TaskStatus,
} from '@tejas96/shared/types';
import { parsePaginationParams } from '@tejas96/shared/utils';
import { plainToInstance } from 'class-transformer';

import { OrganizationContext } from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  AddCommentDto,
  GroupedMyTasksResponseDto,
  MyTaskResponseDto,
  ProjectTaskResponseDto,
  UpdateTaskCrossProjectDto,
  UpdateTaskStatusDto,
} from '../dto';
import { ProjectTaskService } from '../services';

type GroupByMode = 'dueDate' | 'priority' | 'project' | 'status';

/**
 * TasksController
 * Handles cross-project task queries like "My Tasks"
 */
@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly taskService: ProjectTaskService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get tasks assigned to the current user, optionally grouped' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  @ApiQuery({ name: 'priority', required: false, enum: TaskPriority })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    enum: ['dueDate', 'priority', 'project', 'status'],
  })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'dueDateFilter', required: false, enum: ['overdue', 'dueToday', 'thisWeek'] })
  async getMyTasks(
    @CurrentUser() currentUser: CurrentUserType,
    @OrganizationContext() organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: string,
    @Query('groupBy') groupBy?: GroupByMode,
    @Query('projectId') projectId?: string,
    @Query('search') search?: string,
    @Query('dueDateFilter') dueDateFilter?: DueDateFilter,
  ): Promise<GroupedMyTasksResponseDto | PaginatedResponse<ProjectTaskResponseDto>> {
    if (groupBy) {
      const result = await this.taskService.getMyTasksGrouped(
        currentUser.id,
        organizationId,
        groupBy,
        {
          status,
          priority,
          projectId,
          search,
          dueDateFilter,
        },
      );

      return plainToInstance(GroupedMyTasksResponseDto, result, {
        excludeExtraneousValues: true,
      });
    }

    const { page: pageNum, limit: limitNum } = parsePaginationParams(page, limit);

    const result = await this.taskService.getMyTasks(
      currentUser.id,
      organizationId,
      pageNum,
      limitNum,
      {
        status,
        priority,
      },
    );

    return {
      data: plainToInstance(MyTaskResponseDto, result.data, {
        excludeExtraneousValues: true,
      }),
      meta: result.meta,
    };
  }

  @Get('my/summary')
  @ApiOperation({
    summary: 'Get lightweight summary counts for current user tasks (for navigation badges)',
  })
  async getMyTasksSummary(
    @CurrentUser() currentUser: CurrentUserType,
    @OrganizationContext() organizationId: string,
  ): Promise<{ total: number; overdue: number; dueToday: number; completedThisWeek: number }> {
    return this.taskService.getMyTasksSummary(currentUser.id, organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single task detail from cross-project context' })
  async getTaskDetail(
    @CurrentUser() currentUser: CurrentUserType,
    @OrganizationContext() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MyTaskResponseDto> {
    const task = await this.taskService.getTaskDetailCrossProject(
      id,
      currentUser.id,
      organizationId,
      currentUser.roles,
    );
    return plainToInstance(MyTaskResponseDto, task, { excludeExtraneousValues: true });
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update task status from cross-project context (My Tasks)' })
  async updateMyTaskStatus(
    @CurrentUser() currentUser: CurrentUserType,
    @OrganizationContext() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskStatusDto,
  ): Promise<MyTaskResponseDto> {
    const task = await this.taskService.updateTaskStatusCrossProject(
      id,
      dto.status,
      currentUser.id,
      organizationId,
      currentUser.roles,
    );

    const flat = {
      ...task,
      projectNumber: task.project?.projectNumber ?? '',
      projectName: task.project?.name ?? '',
      milestoneName: task.milestoneName ?? undefined,
    };

    return plainToInstance(MyTaskResponseDto, flat, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task fields from cross-project context (My Tasks drawer)' })
  async updateTask(
    @CurrentUser() currentUser: CurrentUserType,
    @OrganizationContext() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskCrossProjectDto,
  ): Promise<MyTaskResponseDto> {
    const task = await this.taskService.updateTaskCrossProject(
      id,
      dto,
      currentUser.id,
      organizationId,
      currentUser.roles,
    );
    return plainToInstance(MyTaskResponseDto, task, { excludeExtraneousValues: true });
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add a comment to a task from cross-project context' })
  async addComment(
    @CurrentUser() currentUser: CurrentUserType,
    @OrganizationContext() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddCommentDto,
  ): Promise<{ success: boolean }> {
    await this.taskService.addComment(
      id,
      dto.comment,
      currentUser.id,
      organizationId,
      currentUser.roles,
    );
    return { success: true };
  }
}

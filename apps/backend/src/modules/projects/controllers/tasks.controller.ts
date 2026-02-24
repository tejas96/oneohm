import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { type PaginatedResponse, TaskPriority, TaskStatus } from '@oneohm-epc/shared-types';
import { OrganizationContext, parsePaginationParams } from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  GroupedMyTasksResponseDto,
  MyTaskResponseDto,
  ProjectTaskResponseDto,
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
  @ApiQuery({ name: 'groupBy', required: false, enum: ['dueDate', 'priority', 'project', 'status'] })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  async getMyTasks(
    @CurrentUser() currentUser: CurrentUserType,
    @OrganizationContext() organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: string,
    @Query('groupBy') groupBy?: GroupByMode,
    @Query('projectId') projectId?: string,
  ): Promise<GroupedMyTasksResponseDto | PaginatedResponse<ProjectTaskResponseDto>> {
    if (groupBy) {
      const result = await this.taskService.getMyTasksGrouped(currentUser.id, organizationId, groupBy, {
        status,
        priority,
        projectId,
      });

      return plainToInstance(GroupedMyTasksResponseDto, result, {
        excludeExtraneousValues: true,
      });
    }

    const { page: pageNum, limit: limitNum } = parsePaginationParams(page, limit);

    const result = await this.taskService.getMyTasks(currentUser.id, organizationId, pageNum, limitNum, {
      status,
      priority,
    });

    return {
      data: plainToInstance(MyTaskResponseDto, result.data, {
        excludeExtraneousValues: true,
      }),
      meta: result.meta,
    };
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
    );

    const flat = {
      ...task,
      projectNumber: task.project?.projectNumber ?? '',
      projectName: task.project?.name ?? '',
      milestoneName: task.milestone?.name,
    };

    return plainToInstance(MyTaskResponseDto, flat, {
      excludeExtraneousValues: true,
    });
  }
}

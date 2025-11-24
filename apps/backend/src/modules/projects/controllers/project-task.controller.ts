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
  type PaginatedResponse,
  type StatisticsResponse,
  TaskPriority,
  TaskStatus,
} from '@oneohm-epc/shared-types';
import { ApiCreate, ApiDelete, ApiReadAll, ApiReadOne, ApiUpdate } from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  CreateProjectTaskDto,
  CreateTaskTimeLogDto,
  ProjectTaskResponseDto,
  TaskActivityLogResponseDto,
  TaskTimeLogResponseDto,
  UpdateProjectTaskDto,
} from '../dto';
import { ProjectTaskService } from '../services';

@ApiTags('Project Tasks')
@ApiBearerAuth()
@Controller('projects/:projectId/tasks')
@UseGuards(JwtAuthGuard)
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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('milestoneId') milestoneId?: string,
    @Query('assignedToUserId') assignedToUserId?: string,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<ProjectTaskResponseDto>> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    const result = await this.taskService.findAll(projectId, pageNum, limitNum, {
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
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<{ code: string }> {
    const code = await this.taskService.generateTaskCode(projectId);
    return { code };
  }

  @Get(':id')
  @ApiReadOne({ responseType: ProjectTaskResponseDto, summary: 'Get project task by ID' })
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

  @Post(':id/time-logs')
  @ApiOperation({ summary: 'Log time for task' })
  async logTime(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() timeLogDto: CreateTaskTimeLogDto,
  ): Promise<ProjectTaskResponseDto> {
    const task = await this.taskService.logTime(
      id,
      projectId,
      timeLogDto.timeSpentHours,
      timeLogDto.workDescription,
      timeLogDto.isBillable,
      timeLogDto.workDate,
      currentUser.id,
    );
    return plainToInstance(ProjectTaskResponseDto, task, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id/time-logs')
  @ApiOperation({ summary: 'Get all time logs for a task' })
  async getTimeLogs(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TaskTimeLogResponseDto[]> {
    const timeLogs = await this.taskService.getTaskTimeLogs(id);
    return plainToInstance(TaskTimeLogResponseDto, timeLogs, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id/activity-log')
  @ApiOperation({ summary: 'Get activity history for a task' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getActivityLog(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: number,
  ): Promise<TaskActivityLogResponseDto[]> {
    const activityLog = await this.taskService.getTaskActivityLog(id, limit);
    return plainToInstance(TaskActivityLogResponseDto, activityLog, {
      excludeExtraneousValues: true,
    });
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

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
import {
  type PaginatedResponse,
  type StatisticsResponse,
  TaskPriority,
  TaskStatus,
} from '@oneohm-epc/shared-types';
import {
  ApiAction,
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
} from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import {
  CreateProjectTaskDto,
  ProjectTaskResponseDto,
  UpdateProjectTaskDto,
} from '../dto';
import { ProjectTaskService } from '../services';

@ApiTags('Project Tasks')
@ApiBearerAuth()
@Controller('projects/:projectId/tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectTaskController {
  constructor(private readonly taskService: ProjectTaskService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
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
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.MANAGER,
    Role.SALES,
    Role.EXECUTION_ENGINEER,
    Role.FIELD_WORKER,
  )
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
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get project task statistics' })
  async getStatistics(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<StatisticsResponse<TaskStatus>> {
    return await this.taskService.getStatistics(projectId);
  }

  @Get('overdue')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
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
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.MANAGER,
    Role.EXECUTION_ENGINEER,
    Role.FIELD_WORKER,
  )
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
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.MANAGER,
    Role.EXECUTION_ENGINEER,
    Role.FIELD_WORKER,
  )
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
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Generate next task code' })
  async generateCode(@Param('projectId', ParseUUIDPipe) projectId: string): Promise<{ code: string }> {
    const code = await this.taskService.generateTaskCode(projectId);
    return { code };
  }

  @Get(':id')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.MANAGER,
    Role.SALES,
    Role.EXECUTION_ENGINEER,
    Role.FIELD_WORKER,
  )
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
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER)
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
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.MANAGER,
    Role.EXECUTION_ENGINEER,
    Role.FIELD_WORKER,
  )
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
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER)
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
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.MANAGER,
    Role.EXECUTION_ENGINEER,
    Role.FIELD_WORKER,
  )
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

  @Post(':id/log-time')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.MANAGER,
    Role.EXECUTION_ENGINEER,
    Role.FIELD_WORKER,
  )
  @ApiOperation({ summary: 'Log time for task' })
  async logTime(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('hours') hours: number,
  ): Promise<ProjectTaskResponseDto> {
    const task = await this.taskService.logTime(id, projectId, hours, currentUser.id);
    return plainToInstance(ProjectTaskResponseDto, task, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
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


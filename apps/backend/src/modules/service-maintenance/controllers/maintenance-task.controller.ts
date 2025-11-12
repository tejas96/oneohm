import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role, JwtAuthGuard, RolesGuard, Roles } from '@oneohm-epc/shared-auth';
import { MaintenanceTaskStatus } from '@oneohm-epc/shared-types';

import {
  CreateMaintenanceTaskDto,
  UpdateMaintenanceTaskDto,
  MaintenanceTaskResponseDto,
} from '../dto';
import { MaintenanceTaskService } from '../services/maintenance-task.service';

/**
 * Controller for Maintenance Task Operations
 */
@ApiTags('Service & Maintenance - Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('maintenance-tasks')
export class MaintenanceTaskController {
  constructor(private readonly maintenanceTaskService: MaintenanceTaskService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER)
  @ApiOperation({ summary: 'Create a new maintenance task' })
  @ApiResponse({
    status: 201,
    description: 'Maintenance task created successfully',
    type: MaintenanceTaskResponseDto,
  })
  async create(
    @Body() createDto: CreateMaintenanceTaskDto,
  ): Promise<MaintenanceTaskResponseDto> {
    return this.maintenanceTaskService.create(createDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Get all maintenance tasks' })
  @ApiResponse({
    status: 200,
    description: 'Maintenance tasks retrieved successfully',
    type: [MaintenanceTaskResponseDto],
  })
  async findAll(
    @Query('includeRelations') includeRelations?: string,
  ): Promise<MaintenanceTaskResponseDto[]> {
    return this.maintenanceTaskService.findAll(includeRelations === 'true');
  }

  @Get('overdue')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Get overdue maintenance tasks' })
  @ApiResponse({
    status: 200,
    description: 'Overdue tasks retrieved successfully',
    type: [MaintenanceTaskResponseDto],
  })
  async findOverdue(
    @Query('includeRelations') includeRelations?: string,
  ): Promise<MaintenanceTaskResponseDto[]> {
    return this.maintenanceTaskService.findOverdue(includeRelations === 'true');
  }

  @Get('upcoming')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Get upcoming maintenance tasks' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days ahead' })
  @ApiResponse({
    status: 200,
    description: 'Upcoming tasks retrieved successfully',
    type: [MaintenanceTaskResponseDto],
  })
  async findUpcoming(
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
    @Query('includeRelations') includeRelations?: string,
  ): Promise<MaintenanceTaskResponseDto[]> {
    return this.maintenanceTaskService.findUpcoming(days || 7, includeRelations === 'true');
  }

  @Get('project/:projectId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Get tasks by project' })
  @ApiResponse({
    status: 200,
    description: 'Tasks retrieved successfully',
    type: [MaintenanceTaskResponseDto],
  })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('includeRelations') includeRelations?: string,
  ): Promise<MaintenanceTaskResponseDto[]> {
    return this.maintenanceTaskService.findByProject(projectId, includeRelations === 'true');
  }

  @Get('user/:userId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Get tasks assigned to user' })
  @ApiResponse({
    status: 200,
    description: 'Tasks retrieved successfully',
    type: [MaintenanceTaskResponseDto],
  })
  async findByAssignedUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('includeRelations') includeRelations?: string,
  ): Promise<MaintenanceTaskResponseDto[]> {
    return this.maintenanceTaskService.findByAssignedUser(userId, includeRelations === 'true');
  }

  @Get('status/:status')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Get tasks by status' })
  @ApiResponse({
    status: 200,
    description: 'Tasks retrieved successfully',
    type: [MaintenanceTaskResponseDto],
  })
  async findByStatus(
    @Param('status') status: MaintenanceTaskStatus,
    @Query('includeRelations') includeRelations?: string,
  ): Promise<MaintenanceTaskResponseDto[]> {
    return this.maintenanceTaskService.findByStatus(status, includeRelations === 'true');
  }

  @Get('statistics/:organizationId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER)
  @ApiOperation({ summary: 'Get task statistics for organization' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<Record<string, unknown>> {
    return this.maintenanceTaskService.getStatistics(organizationId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Get maintenance task by ID' })
  @ApiResponse({
    status: 200,
    description: 'Task retrieved successfully',
    type: MaintenanceTaskResponseDto,
  })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeRelations') includeRelations?: string,
  ): Promise<MaintenanceTaskResponseDto> {
    return this.maintenanceTaskService.findById(id, includeRelations === 'true');
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Update maintenance task' })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
    type: MaintenanceTaskResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateMaintenanceTaskDto,
  ): Promise<MaintenanceTaskResponseDto> {
    return this.maintenanceTaskService.update(id, updateDto);
  }

  @Patch(':id/assign/:userId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER)
  @ApiOperation({ summary: 'Assign task to user' })
  @ApiResponse({
    status: 200,
    description: 'Task assigned successfully',
    type: MaintenanceTaskResponseDto,
  })
  async assignTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('department') department?: string,
  ): Promise<MaintenanceTaskResponseDto> {
    return this.maintenanceTaskService.assignTask(id, userId, department);
  }

  @Patch(':id/complete')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Mark task as completed' })
  @ApiResponse({
    status: 200,
    description: 'Task completed successfully',
    type: MaintenanceTaskResponseDto,
  })
  async completeTask(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MaintenanceTaskResponseDto> {
    return this.maintenanceTaskService.completeTask(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Delete maintenance task' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.maintenanceTaskService.delete(id);
  }
}


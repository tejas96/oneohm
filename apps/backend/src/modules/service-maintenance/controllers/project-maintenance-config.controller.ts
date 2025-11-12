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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { Role, JwtAuthGuard, RolesGuard, Roles } from '@oneohm-epc/shared-auth';
import {
  CreateMaintenanceConfigDto,
  UpdateMaintenanceConfigDto,
  MaintenanceConfigResponseDto,
} from '../dto';
import { ProjectMaintenanceConfigService } from '../services/project-maintenance-config.service';

/**
 * Controller for Project Maintenance Config Operations
 */
@ApiTags('Service & Maintenance - Configs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('maintenance-configs')
export class ProjectMaintenanceConfigController {
  constructor(
    private readonly maintenanceConfigService: ProjectMaintenanceConfigService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER)
  @ApiOperation({ summary: 'Create a new maintenance config' })
  @ApiResponse({
    status: 201,
    description: 'Maintenance config created successfully',
    type: MaintenanceConfigResponseDto,
  })
  async create(
    @Body() createDto: CreateMaintenanceConfigDto,
  ): Promise<MaintenanceConfigResponseDto> {
    return this.maintenanceConfigService.create(createDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Get all maintenance configs' })
  @ApiResponse({
    status: 200,
    description: 'Maintenance configs retrieved successfully',
    type: [MaintenanceConfigResponseDto],
  })
  async findAll(
    @Query('includeRelations') includeRelations?: string,
  ): Promise<MaintenanceConfigResponseDto[]> {
    return this.maintenanceConfigService.findAll(includeRelations === 'true');
  }

  @Get('active')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Get all active maintenance configs' })
  @ApiResponse({
    status: 200,
    description: 'Active maintenance configs retrieved successfully',
    type: [MaintenanceConfigResponseDto],
  })
  async findActive(
    @Query('includeRelations') includeRelations?: string,
  ): Promise<MaintenanceConfigResponseDto[]> {
    return this.maintenanceConfigService.findActive(includeRelations === 'true');
  }

  @Get('upcoming-maintenance')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Get configs with upcoming maintenance' })
  @ApiResponse({
    status: 200,
    description: 'Upcoming maintenance configs retrieved successfully',
    type: [MaintenanceConfigResponseDto],
  })
  async findUpcomingMaintenance(
    @Query('includeRelations') includeRelations?: string,
  ): Promise<MaintenanceConfigResponseDto[]> {
    return this.maintenanceConfigService.findUpcomingMaintenance(undefined, includeRelations === 'true');
  }

  @Get('statistics')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER)
  @ApiOperation({ summary: 'Get maintenance config statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics(): Promise<Record<string, number>> {
    return this.maintenanceConfigService.getStatistics();
  }

  @Get('project/:projectId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Get maintenance config by project ID' })
  @ApiResponse({
    status: 200,
    description: 'Maintenance config retrieved successfully',
    type: MaintenanceConfigResponseDto,
  })
  async findByProjectId(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('includeRelations') includeRelations?: string,
  ): Promise<MaintenanceConfigResponseDto> {
    return this.maintenanceConfigService.findByProjectId(projectId, includeRelations === 'true');
  }

  @Get('organization/:organizationId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER)
  @ApiOperation({ summary: 'Get maintenance configs by organization' })
  @ApiResponse({
    status: 200,
    description: 'Maintenance configs retrieved successfully',
    type: [MaintenanceConfigResponseDto],
  })
  async findByOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('includeRelations') includeRelations?: string,
  ): Promise<MaintenanceConfigResponseDto[]> {
    return this.maintenanceConfigService.findByOrganization(
      organizationId,
      includeRelations === 'true',
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Get maintenance config by ID' })
  @ApiResponse({
    status: 200,
    description: 'Maintenance config retrieved successfully',
    type: MaintenanceConfigResponseDto,
  })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeRelations') includeRelations?: string,
  ): Promise<MaintenanceConfigResponseDto> {
    return this.maintenanceConfigService.findById(id, includeRelations === 'true');
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER)
  @ApiOperation({ summary: 'Update maintenance config' })
  @ApiResponse({
    status: 200,
    description: 'Maintenance config updated successfully',
    type: MaintenanceConfigResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateMaintenanceConfigDto,
  ): Promise<MaintenanceConfigResponseDto> {
    return this.maintenanceConfigService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete maintenance config' })
  @ApiResponse({ status: 200, description: 'Maintenance config deleted successfully' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.maintenanceConfigService.delete(id);
  }
}


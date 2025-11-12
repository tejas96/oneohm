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
import { type PaginatedResponse, type StatisticsResponse } from '@oneohm-epc/shared-types';
import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
} from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import {
  CreateTaskTemplateDto,
  TaskTemplateResponseDto,
  UpdateTaskTemplateDto,
} from '../dto';
import { TaskTemplateService } from '../services';

@ApiTags('Task Templates')
@ApiBearerAuth()
@Controller('task-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TaskTemplateController {
  constructor(private readonly templateService: TaskTemplateService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiCreate({ responseType: TaskTemplateResponseDto, summary: 'Create a new task template' })
  async create(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateTaskTemplateDto,
  ): Promise<TaskTemplateResponseDto> {
    const template = await this.templateService.create(createDto, currentUser.id);
    return plainToInstance(TaskTemplateResponseDto, template, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiReadAll({ responseType: TaskTemplateResponseDto, summary: 'Get all task templates' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @CurrentUser() currentUser: CurrentUserType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<TaskTemplateResponseDto>> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    const result = await this.templateService.findAll(
      currentUser.organizationId,
      pageNum,
      limitNum,
      {
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        type,
        search,
      },
    );

    return {
      data: plainToInstance(TaskTemplateResponseDto, result.data, {
        excludeExtraneousValues: true,
      }),
      meta: result.meta,
    };
  }

  @Get('stats/summary')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get task template statistics' })
  async getStatistics(
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<StatisticsResponse> {
    return await this.templateService.getStatistics(currentUser.organizationId);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiReadOne({ responseType: TaskTemplateResponseDto, summary: 'Get task template by ID' })
  async findOne(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TaskTemplateResponseDto> {
    const template = await this.templateService.findById(id, currentUser.organizationId);
    return plainToInstance(TaskTemplateResponseDto, template, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiUpdate({ responseType: TaskTemplateResponseDto, summary: 'Update task template' })
  async update(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateTaskTemplateDto,
  ): Promise<TaskTemplateResponseDto> {
    const template = await this.templateService.update(
      id,
      currentUser.organizationId,
      updateDto,
      currentUser.id,
    );
    return plainToInstance(TaskTemplateResponseDto, template, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id/toggle-status')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Toggle template active status' })
  async toggleStatus(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TaskTemplateResponseDto> {
    const template = await this.templateService.toggleStatus(
      id,
      currentUser.organizationId,
      currentUser.id,
    );
    return plainToInstance(TaskTemplateResponseDto, template, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiDelete({
    summary: 'Delete task template',
    description: 'Soft delete a task template',
  })
  async remove(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.templateService.remove(id, currentUser.organizationId);
  }
}


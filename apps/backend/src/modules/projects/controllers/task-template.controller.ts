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
import { type PaginatedResponse, type StatisticsResponse } from '@oneohm-epc/shared-types';
import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
  OrganizationContext,
} from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { CreateTaskTemplateDto, TaskTemplateResponseDto, UpdateTaskTemplateDto } from '../dto';
import { TaskTemplateService } from '../services';

@ApiTags('Task Templates')
@ApiBearerAuth()
@Controller('task-templates')
@UseGuards(JwtAuthGuard)
export class TaskTemplateController {
  constructor(private readonly templateService: TaskTemplateService) {}

  @Post()
  @ApiCreate({ responseType: TaskTemplateResponseDto, summary: 'Create a new task template' })
  async create(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateTaskTemplateDto,
  ): Promise<TaskTemplateResponseDto> {
    const template = await this.templateService.create(createDto, currentUser.id);
    return plainToInstance(TaskTemplateResponseDto, template, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiReadAll({ responseType: TaskTemplateResponseDto, summary: 'Get all task templates' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<TaskTemplateResponseDto>> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    const result = await this.templateService.findAll(organizationId, pageNum, limitNum, {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      type,
      search,
    });

    return {
      data: plainToInstance(TaskTemplateResponseDto, result.data, {
        excludeExtraneousValues: true,
      }),
      meta: result.meta,
    };
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get task template statistics' })
  async getStatistics(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<StatisticsResponse> {
    return this.templateService.getStatistics(organizationId);
  }

  @Get(':id')
  @ApiReadOne({ responseType: TaskTemplateResponseDto, summary: 'Get task template by ID' })
  async findOne(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TaskTemplateResponseDto> {
    const template = await this.templateService.findById(id, organizationId);
    return plainToInstance(TaskTemplateResponseDto, template, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @ApiUpdate({ responseType: TaskTemplateResponseDto, summary: 'Update task template' })
  async update(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateTaskTemplateDto,
  ): Promise<TaskTemplateResponseDto> {
    const template = await this.templateService.update(
      id,
      organizationId,
      updateDto,
      currentUser.id,
    );
    return plainToInstance(TaskTemplateResponseDto, template, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle template active status' })
  async toggleStatus(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TaskTemplateResponseDto> {
    const template = await this.templateService.toggleStatus(id, organizationId, currentUser.id);
    return plainToInstance(TaskTemplateResponseDto, template, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @ApiDelete({
    summary: 'Delete task template',
    description: 'Soft delete a task template',
  })
  async remove(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.templateService.remove(id, organizationId);
  }
}

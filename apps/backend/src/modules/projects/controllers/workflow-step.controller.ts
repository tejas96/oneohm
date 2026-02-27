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
  parsePaginationParams,
} from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  CreateWorkflowStepDto,
  WorkflowStepResponseDto,
  UpdateWorkflowStepDto,
} from '../dto';
import { WorkflowStepService } from '../services';

@ApiTags('Workflow Steps')
@ApiBearerAuth()
@Controller('workflow-steps')
@UseGuards(JwtAuthGuard)
export class WorkflowStepController {
  constructor(private readonly stepService: WorkflowStepService) {}

  @Post()
  @ApiCreate({ responseType: WorkflowStepResponseDto, summary: 'Create a new workflow step' })
  async create(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateWorkflowStepDto,
  ): Promise<WorkflowStepResponseDto> {
    createDto.organizationId = organizationId;
    const step = await this.stepService.create(createDto, currentUser.id);
    return plainToInstance(WorkflowStepResponseDto, step, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiReadAll({ responseType: WorkflowStepResponseDto, summary: 'Get all workflow steps' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<WorkflowStepResponseDto>> {
    const { page: pageNum, limit: limitNum } = parsePaginationParams(page, limit);

    const result = await this.stepService.findAll(organizationId, pageNum, limitNum, {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      type,
      search,
    });

    return {
      data: plainToInstance(WorkflowStepResponseDto, result.data, {
        excludeExtraneousValues: true,
      }),
      meta: result.meta,
    };
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get workflow step statistics' })
  async getStatistics(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<StatisticsResponse> {
    return this.stepService.getStatistics(organizationId);
  }

  @Get(':id')
  @ApiReadOne({ responseType: WorkflowStepResponseDto, summary: 'Get workflow step by ID' })
  async findOne(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkflowStepResponseDto> {
    const step = await this.stepService.findById(id, organizationId);
    return plainToInstance(WorkflowStepResponseDto, step, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @ApiUpdate({ responseType: WorkflowStepResponseDto, summary: 'Update workflow step' })
  async update(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateWorkflowStepDto,
  ): Promise<WorkflowStepResponseDto> {
    const step = await this.stepService.update(
      id,
      organizationId,
      updateDto,
      currentUser.id,
    );
    return plainToInstance(WorkflowStepResponseDto, step, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle step active status' })
  async toggleStatus(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkflowStepResponseDto> {
    const step = await this.stepService.toggleStatus(id, organizationId, currentUser.id);
    return plainToInstance(WorkflowStepResponseDto, step, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @ApiDelete({
    summary: 'Delete workflow step',
    description: 'Soft delete a workflow step. Will fail if active tasks reference it.',
  })
  async remove(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.stepService.remove(id, organizationId);
  }
}

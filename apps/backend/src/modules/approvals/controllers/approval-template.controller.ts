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
  type ExtendedStatisticsResponse,
  type PaginatedResponse,
  ApprovalWorkflowType,
} from '@oneohm-epc/shared-types';
import { ApiCreate, ApiDelete, ApiReadAll, ApiReadOne, ApiUpdate } from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import {
  ApprovalTemplateResponseDto,
  CreateApprovalTemplateDto,
  UpdateApprovalTemplateDto,
} from '../dto';
import { ApprovalTemplateService } from '../services';

/**
 * Approval Template Controller
 * Handles HTTP requests for approval workflow templates
 */
@ApiTags('Approval Workflows')
@ApiBearerAuth()
@Controller('approval-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApprovalTemplateController {
  constructor(private readonly templateService: ApprovalTemplateService) {}

  /**
   * Create a new approval template
   */
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiCreate({
    summary: 'Create approval template',
    description: 'Create a new reusable approval workflow template',
    responseType: ApprovalTemplateResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async create(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateApprovalTemplateDto,
  ): Promise<ApprovalTemplateResponseDto> {
    const template = await this.templateService.create(
      currentUser.organizationId,
      createDto,
      currentUser.id,
    );

    return plainToInstance(ApprovalTemplateResponseDto, template, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all approval templates
   */
  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiReadAll({
    summary: 'Get all approval templates',
    description: 'Retrieve all approval workflow templates with pagination and filters',
    responseType: ApprovalTemplateResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'workflowType',
    required: false,
    enum: ApprovalWorkflowType,
    description: 'Filter by workflow type',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search in name, code, description',
  })
  async findAll(
    @CurrentUser() currentUser: CurrentUserType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('workflowType') workflowType?: ApprovalWorkflowType,
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<ApprovalTemplateResponseDto>> {
    const { templates, total } = await this.templateService.findAll(
      currentUser.organizationId,
      page ?? 1,
      limit ?? 20,
      {
        workflowType,
        isActive,
        search,
      },
    );

    return {
      data: plainToInstance(ApprovalTemplateResponseDto, templates, {
        excludeExtraneousValues: true,
      }),
      meta: {
        page: page ?? 1,
        limit: limit ?? 20,
        total,
        totalPages: Math.ceil(total / (limit ?? 20)),
      },
    };
  }

  /**
   * Get approval template by ID
   */
  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiReadOne({
    summary: 'Get approval template by ID',
    description: 'Retrieve a single approval template with all stages',
    responseType: ApprovalTemplateResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
  })
  async findOne(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApprovalTemplateResponseDto> {
    const template = await this.templateService.findById(id, currentUser.organizationId);

    return plainToInstance(ApprovalTemplateResponseDto, template, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get templates by workflow type
   */
  @Get('by-type/:type')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({
    summary: 'Get templates by workflow type',
    description: 'Retrieve all active templates for a specific workflow type',
  })
  async findByWorkflowType(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('type') type: ApprovalWorkflowType,
  ): Promise<ApprovalTemplateResponseDto[]> {
    const templates = await this.templateService.findByWorkflowType(
      type,
      currentUser.organizationId,
    );

    return plainToInstance(ApprovalTemplateResponseDto, templates, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update approval template
   */
  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiUpdate({
    summary: 'Update approval template',
    description: 'Update an existing approval workflow template',
    responseType: ApprovalTemplateResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async update(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateApprovalTemplateDto,
  ): Promise<ApprovalTemplateResponseDto> {
    const template = await this.templateService.update(
      id,
      currentUser.organizationId,
      updateDto,
      currentUser.id,
    );

    return plainToInstance(ApprovalTemplateResponseDto, template, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Delete approval template
   */
  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiDelete({
    summary: 'Delete approval template',
    description: 'Soft delete an approval workflow template',
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async delete(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.templateService.delete(id, currentUser.organizationId, currentUser.id);

    return { message: 'Template deleted successfully' };
  }

  /**
   * Get template statistics
   */
  @Get('stats/summary')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Get template statistics',
    description: 'Get approval template statistics by workflow type and status',
  })
  async getStatistics(
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<ExtendedStatisticsResponse<string, ApprovalWorkflowType>> {
    return this.templateService.getStatistics(currentUser.organizationId);
  }

  /**
   * Toggle template status
   */
  @Patch(':id/toggle-status')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary: 'Toggle template status',
    description: 'Activate or deactivate an approval template',
  })
  async toggleStatus(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApprovalTemplateResponseDto> {
    const template = await this.templateService.toggleStatus(
      id,
      currentUser.organizationId,
      currentUser.id,
    );

    return plainToInstance(ApprovalTemplateResponseDto, template, {
      excludeExtraneousValues: true,
    });
  }
}

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
import { type StatisticsResponse, MaterialDispatchStatus } from '@oneohm-epc/shared-types';
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
import {
  CreateMaterialDispatchDto,
  MaterialDispatchResponseDto,
  UpdateMaterialDispatchDto,
  UpdateMaterialDispatchStatusDto,
} from '../dto';
import { MaterialDispatchService } from '../services';

/**
 * Material Dispatch Controller
 * Handles HTTP requests for material dispatch management
 */
@ApiTags('Inventory - Material Dispatches')
@ApiBearerAuth()
@Controller('material-dispatches')
@UseGuards(JwtAuthGuard)
export class MaterialDispatchController {
  constructor(private readonly materialDispatchService: MaterialDispatchService) {}

  /**
   * Create a new material dispatch
   */
  @Post()
  @ApiCreate({
    summary: 'Create a material dispatch',
    description: 'Create a new material dispatch to project site',
    responseType: MaterialDispatchResponseDto,
  })
  async create(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateMaterialDispatchDto,
  ): Promise<MaterialDispatchResponseDto> {
    const dispatch = await this.materialDispatchService.create(
      organizationId,
      createDto,
      currentUser.id,
    );

    return plainToInstance(MaterialDispatchResponseDto, dispatch, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all material dispatches with filters
   */
  @Get()
  @ApiReadAll({
    summary: 'Get all material dispatches',
    description: 'Retrieve all material dispatches with optional filters and pagination',
    responseType: MaterialDispatchResponseDto,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 20,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: Object.values(MaterialDispatchStatus),
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    type: String,
    description: 'Filter by project',
  })
  @ApiQuery({
    name: 'warehouseId',
    required: false,
    type: String,
    description: 'Filter by warehouse',
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    type: String,
    description: 'Filter by date range (start)',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    type: String,
    description: 'Filter by date range (end)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by dispatch number or project number',
  })
  async findAll(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: MaterialDispatchStatus,
    @Query('projectId') projectId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('search') search?: string,
  ): Promise<{
    data: MaterialDispatchResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { dispatches, total } = await this.materialDispatchService.findAll(
      organizationId,
      page,
      limit,
      {
        status,
        projectId,
        warehouseId,
        fromDate,
        toDate,
        search,
      },
    );

    return {
      data: plainToInstance(MaterialDispatchResponseDto, dispatches, {
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
   * Get material dispatch by ID
   */
  @Get(':id')
  @ApiReadOne({
    summary: 'Get material dispatch by ID',
    description: 'Retrieve a specific material dispatch by its ID',
    responseType: MaterialDispatchResponseDto,
  })
  async findOne(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MaterialDispatchResponseDto> {
    const dispatch = await this.materialDispatchService.findById(id, organizationId);

    return plainToInstance(MaterialDispatchResponseDto, dispatch, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get dispatches by project
   */
  @Get('project/:projectId')
  @ApiOperation({
    summary: 'Get dispatches by project',
    description: 'Retrieve all material dispatches for a specific project',
  })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<MaterialDispatchResponseDto[]> {
    const dispatches = await this.materialDispatchService.findByProject(projectId);

    return plainToInstance(MaterialDispatchResponseDto, dispatches, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update material dispatch
   */
  @Patch(':id')
  @ApiUpdate({
    summary: 'Update material dispatch',
    description: 'Update an existing material dispatch (draft/prepared only)',
    responseType: MaterialDispatchResponseDto,
  })
  async update(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateMaterialDispatchDto,
  ): Promise<MaterialDispatchResponseDto> {
    const dispatch = await this.materialDispatchService.update(
      id,
      organizationId,
      updateDto,
      currentUser.id,
    );

    return plainToInstance(MaterialDispatchResponseDto, dispatch, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update dispatch status
   */
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update dispatch status',
    description: 'Update the status of a material dispatch',
  })
  async updateStatus(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateMaterialDispatchStatusDto,
  ): Promise<MaterialDispatchResponseDto> {
    const dispatch = await this.materialDispatchService.updateStatus(
      id,
      organizationId,
      statusDto,
      currentUser.id,
    );

    return plainToInstance(MaterialDispatchResponseDto, dispatch, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Cancel material dispatch
   */
  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel material dispatch',
    description: 'Cancel a material dispatch',
  })
  async cancel(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ): Promise<MaterialDispatchResponseDto> {
    const dispatch = await this.materialDispatchService.cancel(
      id,
      organizationId,
      reason,
      currentUser.id,
    );

    return plainToInstance(MaterialDispatchResponseDto, dispatch, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Delete material dispatch
   */
  @Delete(':id')
  @ApiDelete({
    summary: 'Delete material dispatch',
    description: 'Delete a material dispatch (draft only)',
  })
  async delete(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.materialDispatchService.delete(id, organizationId);

    return { message: 'Material dispatch deleted successfully' };
  }

  /**
   * Get dispatch statistics
   */
  @Get('stats/summary')
  @ApiOperation({
    summary: 'Get dispatch statistics',
    description: 'Get dispatch count by status',
  })
  async getStatistics(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<StatisticsResponse<MaterialDispatchStatus>> {
    return this.materialDispatchService.getStatistics(organizationId);
  }

  /**
   * Get in-transit dispatches
   */
  @Get('in-transit/list')
  @ApiOperation({
    summary: 'Get in-transit dispatches',
    description: 'Get list of dispatches currently in transit',
  })
  async getInTransit(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<MaterialDispatchResponseDto[]> {
    const dispatches = await this.materialDispatchService.getInTransitDispatches(organizationId);

    return plainToInstance(MaterialDispatchResponseDto, dispatches, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get pending dispatches
   */
  @Get('pending/list')
  @ApiOperation({
    summary: 'Get pending dispatches',
    description: 'Get list of draft and prepared dispatches',
  })
  async getPending(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<MaterialDispatchResponseDto[]> {
    const dispatches = await this.materialDispatchService.getPendingDispatches(organizationId);

    return plainToInstance(MaterialDispatchResponseDto, dispatches, {
      excludeExtraneousValues: true,
    });
  }
}

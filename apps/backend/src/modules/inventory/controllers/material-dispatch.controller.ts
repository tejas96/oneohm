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
import { MaterialDispatchStatus } from '@oneohm-epc/shared/types';
import { parsePaginationParams } from '@oneohm-epc/shared/utils';
import { plainToInstance } from 'class-transformer';

import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
  OrganizationContext,
} from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { PermissionGuard } from '../../iam/guards/permission.guard';
import {
  CreateMaterialDispatchDto,
  MaterialDispatchResponseDto,
  UpdateMaterialDispatchDto,
  UpdateMaterialDispatchStatusDto,
} from '../dto';
import { MaterialDispatchService } from '../services';

/**
 * Material Dispatch Controller
 * IMPORTANT: Static sub-paths are declared BEFORE :id routes.
 */
@ApiTags('Inventory - Material Dispatches')
@ApiBearerAuth()
@Controller('material-dispatches')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class MaterialDispatchController {
  constructor(private readonly materialDispatchService: MaterialDispatchService) {}

  // ==================== Static Routes (MUST come before :id) ====================

  /**
   * Get dispatch statistics
   */
  @RequirePermission('inventory:read')
  @Get('stats/summary')
  @ApiOperation({ summary: 'Get dispatch statistics' })
  async getStatistics(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ) {
    return this.materialDispatchService.getStatistics(organizationId);
  }

  /**
   * Get in-transit dispatches
   */
  @RequirePermission('inventory:read')
  @Get('in-transit/list')
  @ApiOperation({ summary: 'Get in-transit dispatches' })
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
  @RequirePermission('inventory:read')
  @Get('pending/list')
  @ApiOperation({ summary: 'Get pending (draft/prepared) dispatches' })
  async getPending(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<MaterialDispatchResponseDto[]> {
    const dispatches = await this.materialDispatchService.getPendingDispatches(organizationId);
    return plainToInstance(MaterialDispatchResponseDto, dispatches, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get dispatches by project
   */
  @RequirePermission('inventory:read')
  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get dispatches for a specific project' })
  async findByProject(
    @OrganizationContext() organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<MaterialDispatchResponseDto[]> {
    const dispatches = await this.materialDispatchService.findByProject(projectId, organizationId);
    return plainToInstance(MaterialDispatchResponseDto, dispatches, {
      excludeExtraneousValues: true,
    });
  }

  // ==================== Collection Routes ====================

  /**
   * Create a new material dispatch
   */
  @RequirePermission('dispatch:write')
  @Post()
  @ApiCreate({
    summary: 'Create a material dispatch',
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
  @RequirePermission('inventory:read')
  @Get()
  @ApiReadAll({
    summary: 'Get all material dispatches',
    responseType: MaterialDispatchResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: Object.values(MaterialDispatchStatus) })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Query() query: Record<string, string>,
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
    const { page: pageNum, limit: limitNum } = parsePaginationParams(query.page, query.limit);
    const { dispatches, total } = await this.materialDispatchService.findAll(
      organizationId,
      pageNum,
      limitNum,
      { status, projectId, warehouseId, fromDate, toDate, search },
    );

    return {
      data: plainToInstance(MaterialDispatchResponseDto, dispatches, {
        excludeExtraneousValues: true,
      }),
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };
  }

  // ==================== Item Routes (:id — MUST come after static routes) ====================

  /**
   * Get material dispatch by ID
   */
  @RequirePermission('inventory:read')
  @Get(':id')
  @ApiReadOne({ summary: 'Get material dispatch by ID', responseType: MaterialDispatchResponseDto })
  async findOne(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MaterialDispatchResponseDto> {
    const dispatch = await this.materialDispatchService.findById(id, organizationId);
    return plainToInstance(MaterialDispatchResponseDto, dispatch, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update material dispatch
   */
  @RequirePermission('dispatch:write')
  @Patch(':id')
  @ApiUpdate({
    summary: 'Update material dispatch',
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
  @RequirePermission('dispatch:write')
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update dispatch status' })
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
   * Mark dispatch as dispatched (IN_TRANSIT)
   */
  @RequirePermission('dispatch:write')
  @Post(':id/mark-dispatched')
  @ApiOperation({ summary: 'Mark dispatch as IN_TRANSIT — deducts reserved stock' })
  async markDispatched(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MaterialDispatchResponseDto> {
    const dispatch = await this.materialDispatchService.markDispatched(
      id,
      organizationId,
      currentUser.id,
    );
    return plainToInstance(MaterialDispatchResponseDto, dispatch, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Mark dispatch as DELIVERED. Allowed from IN_TRANSIT or PARTIALLY_DELIVERED.
   */
  @RequirePermission('dispatch:write')
  @Post(':id/mark-delivered')
  @ApiOperation({ summary: 'Mark dispatch as DELIVERED' })
  async markDelivered(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { actualDeliveryDate?: string; receivedById?: string } = {},
  ): Promise<MaterialDispatchResponseDto> {
    const dispatch = await this.materialDispatchService.markDelivered(
      id,
      organizationId,
      currentUser.id,
      body.actualDeliveryDate ? new Date(body.actualDeliveryDate) : undefined,
      body.receivedById,
    );
    return plainToInstance(MaterialDispatchResponseDto, dispatch, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Cancel material dispatch
   */
  @RequirePermission('dispatch:write')
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel material dispatch' })
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
  @RequirePermission('dispatch:write')
  @Delete(':id')
  @ApiDelete({ summary: 'Delete a material dispatch (draft only)' })
  async delete(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.materialDispatchService.delete(id, organizationId);
    return { message: 'Material dispatch deleted successfully' };
  }
}

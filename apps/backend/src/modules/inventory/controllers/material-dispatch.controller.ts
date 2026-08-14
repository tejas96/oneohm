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
import { MaterialDispatchStatus } from '@tejas96/shared/types';
import { parsePaginationParams } from '@tejas96/shared/utils';
import { plainToInstance } from 'class-transformer';

import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
} from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  BulkCancelDto,
  BulkOperationResultDto,
  CreateMaterialDispatchDto,
  MaterialDispatchResponseDto,
  UpdateMaterialDispatchDto,
  UpdateMaterialDispatchStatusDto,
} from '../dto';
import type { FunnelResponse } from '../dto/common';
import { InventoryBulkService, InventoryStatsService, MaterialDispatchService } from '../services';

/**
 * Material Dispatch Controller
 * IMPORTANT: Static sub-paths are declared BEFORE :id routes.
 */
@ApiTags('Inventory - Material Dispatches')
@ApiBearerAuth()
@Controller('material-dispatches')
@UseGuards(JwtAuthGuard)
export class MaterialDispatchController {
  constructor(
    private readonly materialDispatchService: MaterialDispatchService,
    private readonly inventoryBulkService: InventoryBulkService,
    private readonly inventoryStatsService: InventoryStatsService,
  ) {}

  // ==================== Static Routes (MUST come before :id) ====================

  /**
   * Bulk cancel dispatches (best-effort, restores reserved stock per id)
   */
  @Post('bulk/cancel')
  @ApiOperation({
    summary: 'Bulk cancel dispatches (best-effort)',
    description:
      'Returns { succeeded: string[], failed: { id, reason }[] } at HTTP 200. Each cancel runs in its own transaction and restores reserved stock if applicable.',
  })
  async bulkCancel(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() body: BulkCancelDto,
  ): Promise<BulkOperationResultDto> {
    return this.inventoryBulkService.cancelDispatches(body.ids, body.reason, currentUser.id);
  }

  /**
   * Get dispatch statistics
   */
  @Get('stats/summary')
  @ApiOperation({ summary: 'Get dispatch statistics' })
  async getStatistics(@CurrentUser() _currentUser: CurrentUserType) {
    return this.materialDispatchService.getStatistics();
  }

  @Get('stats/funnel')
  @ApiOperation({ summary: 'Dispatch funnel: lifecycle counts in window + cancelled side-bucket' })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  async statsFunnel(
    @CurrentUser() _currentUser: CurrentUserType,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ): Promise<FunnelResponse> {
    return this.inventoryStatsService.dispatchFunnel(fromDate, toDate);
  }

  /**
   * Get in-transit dispatches
   */
  @Get('in-transit/list')
  @ApiOperation({ summary: 'Get in-transit dispatches' })
  async getInTransit(
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<MaterialDispatchResponseDto[]> {
    const dispatches = await this.materialDispatchService.getInTransitDispatches();
    return plainToInstance(MaterialDispatchResponseDto, dispatches, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get pending dispatches
   */
  @Get('pending/list')
  @ApiOperation({ summary: 'Get pending (draft/prepared) dispatches' })
  async getPending(
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<MaterialDispatchResponseDto[]> {
    const dispatches = await this.materialDispatchService.getPendingDispatches();
    return plainToInstance(MaterialDispatchResponseDto, dispatches, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get dispatches by project
   */
  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get dispatches for a specific project' })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<MaterialDispatchResponseDto[]> {
    const dispatches = await this.materialDispatchService.findByProject(projectId);
    return plainToInstance(MaterialDispatchResponseDto, dispatches, {
      excludeExtraneousValues: true,
    });
  }

  // ==================== Collection Routes ====================

  /**
   * Create a new material dispatch
   */
  @Post()
  @ApiCreate({
    summary: 'Create a material dispatch',
    responseType: MaterialDispatchResponseDto,
  })
  async create(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateMaterialDispatchDto,
  ): Promise<MaterialDispatchResponseDto> {
    const dispatch = await this.materialDispatchService.create(createDto, currentUser.id);
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
    const { dispatches, total } = await this.materialDispatchService.findAll(pageNum, limitNum, {
      status,
      projectId,
      warehouseId,
      fromDate,
      toDate,
      search,
    });

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
  @Get(':id')
  @ApiReadOne({ summary: 'Get material dispatch by ID', responseType: MaterialDispatchResponseDto })
  async findOne(
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MaterialDispatchResponseDto> {
    const dispatch = await this.materialDispatchService.findById(id);
    return plainToInstance(MaterialDispatchResponseDto, dispatch, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update material dispatch
   */
  @Patch(':id')
  @ApiUpdate({
    summary: 'Update material dispatch',
    responseType: MaterialDispatchResponseDto,
  })
  async update(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateMaterialDispatchDto,
  ): Promise<MaterialDispatchResponseDto> {
    const dispatch = await this.materialDispatchService.update(id, updateDto, currentUser.id);
    return plainToInstance(MaterialDispatchResponseDto, dispatch, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update dispatch status
   */
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update dispatch status' })
  async updateStatus(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateMaterialDispatchStatusDto,
  ): Promise<MaterialDispatchResponseDto> {
    const dispatch = await this.materialDispatchService.updateStatus(id, statusDto, currentUser.id);
    return plainToInstance(MaterialDispatchResponseDto, dispatch, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Mark dispatch as dispatched (IN_TRANSIT)
   */
  @Post(':id/mark-dispatched')
  @ApiOperation({ summary: 'Mark dispatch as IN_TRANSIT — deducts reserved stock' })
  async markDispatched(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MaterialDispatchResponseDto> {
    const dispatch = await this.materialDispatchService.markDispatched(id, currentUser.id);
    return plainToInstance(MaterialDispatchResponseDto, dispatch, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Mark dispatch as DELIVERED. Allowed from IN_TRANSIT or PARTIALLY_DELIVERED.
   */
  @Post(':id/mark-delivered')
  @ApiOperation({ summary: 'Mark dispatch as DELIVERED' })
  async markDelivered(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { actualDeliveryDate?: string; receivedById?: string } = {},
  ): Promise<MaterialDispatchResponseDto> {
    const dispatch = await this.materialDispatchService.markDelivered(
      id,
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
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel material dispatch' })
  async cancel(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ): Promise<MaterialDispatchResponseDto> {
    const dispatch = await this.materialDispatchService.cancel(id, reason, currentUser.id);
    return plainToInstance(MaterialDispatchResponseDto, dispatch, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Delete material dispatch
   */
  @Delete(':id')
  @ApiDelete({ summary: 'Delete a material dispatch (draft only)' })
  async delete(
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.materialDispatchService.delete(id);
    return { message: 'Material dispatch deleted successfully' };
  }
}

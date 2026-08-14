import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { StockAllocationStatus } from '@tejas96/shared/types';
import { parsePaginationParams } from '@tejas96/shared/utils';
import { plainToInstance } from 'class-transformer';

import { ApiCreate, ApiReadAll, ApiReadOne, ApiUpdate } from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  BulkCancelDto,
  BulkOperationResultDto,
  CreateStockAllocationDto,
  EditAllocationDetailsDto,
  FulfillStockAllocationDto,
  ReturnStockAllocationDto,
  StockAllocationResponseDto,
} from '../dto';
import type { FunnelResponse } from '../dto/common';
import { InventoryBulkService, InventoryStatsService, StockAllocationService } from '../services';

/**
 * Stock Allocation Controller
 * IMPORTANT: Static sub-paths (stats/summary, pending/list, project/:projectId) are
 * declared BEFORE :id to prevent NestJS from treating them as UUID params.
 */
@ApiTags('Inventory - Stock Allocations')
@ApiBearerAuth()
@Controller('stock-allocations')
@UseGuards(JwtAuthGuard)
export class StockAllocationController {
  constructor(
    private readonly stockAllocationService: StockAllocationService,
    private readonly inventoryBulkService: InventoryBulkService,
    private readonly inventoryStatsService: InventoryStatsService,
  ) {}

  // ==================== Static Routes (MUST come before :id) ====================

  /**
   * Bulk cancel allocations (best-effort, releases reserved stock per id)
   */
  @Post('bulk/cancel')
  @ApiOperation({
    summary: 'Bulk cancel allocations (best-effort)',
    description:
      'Returns { succeeded: string[], failed: { id, reason }[] } at HTTP 200. Each cancel runs in its own transaction.',
  })
  async bulkCancel(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() body: BulkCancelDto,
  ): Promise<BulkOperationResultDto> {
    return this.inventoryBulkService.cancelAllocations(body.ids, body.reason, currentUser.id);
  }

  /**
   * Get stock allocation statistics
   */
  @Get('stats/summary')
  @ApiOperation({ summary: 'Get stock allocation statistics' })
  async getStatistics(@CurrentUser() _currentUser: CurrentUserType) {
    return this.stockAllocationService.getStatistics();
  }

  @Get('stats/funnel')
  @ApiOperation({
    summary: 'Allocation funnel: lifecycle counts in window + cancelled side-bucket',
  })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  async statsFunnel(
    @CurrentUser() _currentUser: CurrentUserType,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ): Promise<FunnelResponse> {
    return this.inventoryStatsService.allocationFunnel(fromDate, toDate);
  }

  /**
   * Get pending allocations
   */
  @Get('pending/list')
  @ApiOperation({ summary: 'Get pending (not yet fulfilled) allocations' })
  async getPending(
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<StockAllocationResponseDto[]> {
    const allocations = await this.stockAllocationService.getPendingAllocations();
    return plainToInstance(StockAllocationResponseDto, allocations, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get allocations by project
   */
  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get allocations for a specific project' })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<StockAllocationResponseDto[]> {
    const allocations = await this.stockAllocationService.findByProject(projectId);
    return plainToInstance(StockAllocationResponseDto, allocations, {
      excludeExtraneousValues: true,
    });
  }

  // ==================== Collection Routes ====================

  /**
   * Create a new stock allocation
   */
  @Post()
  @ApiCreate({
    summary: 'Create a stock allocation',
    description: 'Allocate stock to a project (reserves inventory)',
    responseType: StockAllocationResponseDto,
  })
  async create(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateStockAllocationDto,
  ): Promise<StockAllocationResponseDto> {
    const allocation = await this.stockAllocationService.create(createDto, currentUser.id);
    return plainToInstance(StockAllocationResponseDto, allocation, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all stock allocations with filters
   */
  @Get()
  @ApiReadAll({
    summary: 'Get all stock allocations',
    responseType: StockAllocationResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: Object.values(StockAllocationStatus) })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    type: Boolean,
    description:
      'If true, exclude cancelled and completed allocations (inventory dashboard “active” count / Phase 9.3). Ignored when status is set.',
  })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({ name: 'productId', required: false, type: String })
  async findAll(
    @CurrentUser() _currentUser: CurrentUserType,
    @Query() query: Record<string, string>,
    @Query('status') status?: StockAllocationStatus,
    @Query('activeOnly') activeOnlyRaw?: string,
    @Query('projectId') projectId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
  ): Promise<{
    data: StockAllocationResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page: pageNum, limit: limitNum } = parsePaginationParams(query.page, query.limit);
    const activeOnly = activeOnlyRaw === 'true' || activeOnlyRaw === '1';
    const { allocations, total } = await this.stockAllocationService.findAll(pageNum, limitNum, {
      status,
      activeOnly: status ? undefined : activeOnly,
      projectId,
      warehouseId,
      productId,
    });

    return {
      data: plainToInstance(StockAllocationResponseDto, allocations, {
        excludeExtraneousValues: true,
      }),
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };
  }

  // ==================== Item Routes (:id — MUST come after static routes) ====================

  /**
   * Get stock allocation by ID
   */
  @Get(':id')
  @ApiReadOne({
    summary: 'Get stock allocation by ID',
    responseType: StockAllocationResponseDto,
  })
  async findOne(
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StockAllocationResponseDto> {
    const allocation = await this.stockAllocationService.findById(id);
    return plainToInstance(StockAllocationResponseDto, allocation, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Edit allocation metadata (notes/expectedDispatchDate only)
   */
  @Patch(':id')
  @ApiUpdate({
    summary: 'Edit allocation details',
    description: 'Edit notes or expectedDispatchDate only. Quantity changes via domain methods.',
    responseType: StockAllocationResponseDto,
  })
  async update(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() editDto: EditAllocationDetailsDto,
  ): Promise<StockAllocationResponseDto> {
    const allocation = await this.stockAllocationService.update(id, editDto, currentUser.id);
    return plainToInstance(StockAllocationResponseDto, allocation, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Fulfill stock allocation
   */
  @Post(':id/fulfill')
  @ApiOperation({ summary: 'Fulfill allocated stock (full or partial)' })
  async fulfill(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() fulfillDto: FulfillStockAllocationDto,
  ): Promise<StockAllocationResponseDto> {
    const allocation = await this.stockAllocationService.fulfill(id, fulfillDto, currentUser.id);
    return plainToInstance(StockAllocationResponseDto, allocation, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Cancel stock allocation
   */
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a stock allocation (releases reserved stock)' })
  async cancel(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ): Promise<StockAllocationResponseDto> {
    const allocation = await this.stockAllocationService.cancel(id, reason, currentUser.id);
    return plainToInstance(StockAllocationResponseDto, allocation, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Return stock from allocation back to available
   */
  @Post(':id/return')
  @ApiOperation({ summary: 'Return dispatched material back to stock' })
  async returnToStock(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() returnDto: ReturnStockAllocationDto,
  ): Promise<StockAllocationResponseDto> {
    const allocation = await this.stockAllocationService.returnToStock(
      id,
      returnDto.quantity,
      returnDto.reason,
      currentUser.id,
    );
    return plainToInstance(StockAllocationResponseDto, allocation, {
      excludeExtraneousValues: true,
    });
  }
}

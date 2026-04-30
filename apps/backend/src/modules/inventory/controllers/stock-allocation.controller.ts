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
import { StockAllocationStatus } from '@oneohm-epc/shared/types';
import { parsePaginationParams } from '@oneohm-epc/shared/utils';
import { plainToInstance } from 'class-transformer';

import {
  ApiCreate,
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
  BulkCancelDto,
  BulkOperationResultDto,
  CreateStockAllocationDto,
  EditAllocationDetailsDto,
  FulfillStockAllocationDto,
  StockAllocationResponseDto,
} from '../dto';
import type { FunnelResponse } from '../dto/common';
import {
  InventoryBulkService,
  InventoryStatsService,
  StockAllocationService,
} from '../services';

/**
 * Stock Allocation Controller
 * IMPORTANT: Static sub-paths (stats/summary, pending/list, project/:projectId) are
 * declared BEFORE :id to prevent NestJS from treating them as UUID params.
 */
@ApiTags('Inventory - Stock Allocations')
@ApiBearerAuth()
@Controller('stock-allocations')
@UseGuards(JwtAuthGuard, PermissionGuard)
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
  @RequirePermission('allocation:write')
  @Post('bulk/cancel')
  @ApiOperation({
    summary: 'Bulk cancel allocations (best-effort)',
    description:
      'Returns { succeeded: string[], failed: { id, reason }[] } at HTTP 200. Each cancel runs in its own transaction.',
  })
  async bulkCancel(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() body: BulkCancelDto,
  ): Promise<BulkOperationResultDto> {
    return this.inventoryBulkService.cancelAllocations(
      body.ids,
      organizationId,
      body.reason,
      currentUser.id,
    );
  }

  /**
   * Get stock allocation statistics
   */
  @RequirePermission('inventory:read')
  @Get('stats/summary')
  @ApiOperation({ summary: 'Get stock allocation statistics' })
  async getStatistics(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ) {
    return this.stockAllocationService.getStatistics(organizationId);
  }

  @RequirePermission('inventory:read')
  @Get('stats/funnel')
  @ApiOperation({ summary: 'Allocation funnel: lifecycle counts in window + cancelled side-bucket' })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  async statsFunnel(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ): Promise<FunnelResponse> {
    return this.inventoryStatsService.allocationFunnel(organizationId, fromDate, toDate);
  }

  /**
   * Get pending allocations
   */
  @RequirePermission('inventory:read')
  @Get('pending/list')
  @ApiOperation({ summary: 'Get pending (not yet fulfilled) allocations' })
  async getPending(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<StockAllocationResponseDto[]> {
    const allocations = await this.stockAllocationService.getPendingAllocations(organizationId);
    return plainToInstance(StockAllocationResponseDto, allocations, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get allocations by project
   */
  @RequirePermission('inventory:read')
  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get allocations for a specific project' })
  async findByProject(
    @OrganizationContext() organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<StockAllocationResponseDto[]> {
    const allocations = await this.stockAllocationService.findByProject(projectId, organizationId);
    return plainToInstance(StockAllocationResponseDto, allocations, {
      excludeExtraneousValues: true,
    });
  }

  // ==================== Collection Routes ====================

  /**
   * Create a new stock allocation
   */
  @RequirePermission('allocation:write')
  @Post()
  @ApiCreate({
    summary: 'Create a stock allocation',
    description: 'Allocate stock to a project (reserves inventory)',
    responseType: StockAllocationResponseDto,
  })
  async create(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateStockAllocationDto,
  ): Promise<StockAllocationResponseDto> {
    const allocation = await this.stockAllocationService.create(
      organizationId,
      createDto,
      currentUser.id,
    );
    return plainToInstance(StockAllocationResponseDto, allocation, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all stock allocations with filters
   */
  @RequirePermission('inventory:read')
  @Get()
  @ApiReadAll({
    summary: 'Get all stock allocations',
    responseType: StockAllocationResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: Object.values(StockAllocationStatus) })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({ name: 'productId', required: false, type: String })
  async findAll(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Query() query: Record<string, string>,
    @Query('status') status?: StockAllocationStatus,
    @Query('projectId') projectId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
  ): Promise<{
    data: StockAllocationResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page: pageNum, limit: limitNum } = parsePaginationParams(query.page, query.limit);
    const { allocations, total } = await this.stockAllocationService.findAll(
      organizationId,
      pageNum,
      limitNum,
      { status, projectId, warehouseId, productId },
    );

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
  @RequirePermission('inventory:read')
  @Get(':id')
  @ApiReadOne({
    summary: 'Get stock allocation by ID',
    responseType: StockAllocationResponseDto,
  })
  async findOne(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StockAllocationResponseDto> {
    const allocation = await this.stockAllocationService.findById(id, organizationId);
    return plainToInstance(StockAllocationResponseDto, allocation, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Edit allocation metadata (notes/expectedDispatchDate only)
   */
  @RequirePermission('allocation:write')
  @Patch(':id')
  @ApiUpdate({
    summary: 'Edit allocation details',
    description: 'Edit notes or expectedDispatchDate only. Quantity changes via domain methods.',
    responseType: StockAllocationResponseDto,
  })
  async update(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() editDto: EditAllocationDetailsDto,
  ): Promise<StockAllocationResponseDto> {
    const allocation = await this.stockAllocationService.update(
      id,
      organizationId,
      editDto,
      currentUser.id,
    );
    return plainToInstance(StockAllocationResponseDto, allocation, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Fulfill stock allocation
   */
  @RequirePermission('allocation:write')
  @Post(':id/fulfill')
  @ApiOperation({ summary: 'Fulfill allocated stock (full or partial)' })
  async fulfill(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() fulfillDto: FulfillStockAllocationDto,
  ): Promise<StockAllocationResponseDto> {
    const allocation = await this.stockAllocationService.fulfill(
      id,
      organizationId,
      fulfillDto,
      currentUser.id,
    );
    return plainToInstance(StockAllocationResponseDto, allocation, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Cancel stock allocation
   */
  @RequirePermission('allocation:write')
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a stock allocation (releases reserved stock)' })
  async cancel(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ): Promise<StockAllocationResponseDto> {
    const allocation = await this.stockAllocationService.cancel(
      id,
      organizationId,
      reason,
      currentUser.id,
    );
    return plainToInstance(StockAllocationResponseDto, allocation, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Return stock from allocation back to available
   */
  @RequirePermission('allocation:write')
  @Post(':id/return')
  @ApiOperation({ summary: 'Return dispatched material back to stock' })
  async returnToStock(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('quantity') quantity: number,
    @Body('reason') reason: string,
  ): Promise<StockAllocationResponseDto> {
    const allocation = await this.stockAllocationService.returnToStock(
      id,
      organizationId,
      quantity,
      reason,
      currentUser.id,
    );
    return plainToInstance(StockAllocationResponseDto, allocation, {
      excludeExtraneousValues: true,
    });
  }
}

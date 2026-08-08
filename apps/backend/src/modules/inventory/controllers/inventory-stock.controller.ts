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
import { type PaginatedResponse } from '@tejas96/shared/types';
import { parsePaginationParams } from '@tejas96/shared/utils';
import { plainToInstance } from 'class-transformer';

import { ApiReadAll } from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { PermissionGuard } from '../../iam/guards/permission.guard';
import {
  InventoryStockResponseDto,
  StockAdjustmentDto,
  StockTransferDto,
  UpdateInventoryStockDto,
  UpdateStockDto,
} from '../dto';
import type { TopItemsResponse } from '../dto/common';
import { InventoryStatsService, InventoryStockService } from '../services';

/**
 * Inventory Stock Controller
 * Handles HTTP requests for stock management
 */
@ApiTags('Inventory - Stock Management')
@ApiBearerAuth()
@Controller('inventory-stock')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class InventoryStockController {
  constructor(
    private readonly inventoryStockService: InventoryStockService,
    private readonly inventoryStatsService: InventoryStatsService,
  ) {}

  /**
   * Get all stock across organization
   */
  @RequirePermission('inventory:read')
  @Get()
  @ApiReadAll({
    summary: 'Get all stock',
    description: 'Retrieve stock levels across all warehouses',
    responseType: InventoryStockResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'lowStock', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  async findAll(
    @Query() query: Record<string, string>,
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<PaginatedResponse<InventoryStockResponseDto>> {
    const { page: pageNum, limit: limitNum } = parsePaginationParams(query.page, query.limit);
    const lowStock =
      query.lowStock === 'true' ? true : query.lowStock === 'false' ? false : undefined;
    const normalizedOrder: 'ASC' | 'DESC' | undefined =
      sortOrder === 'ASC' || sortOrder === 'DESC' ? sortOrder : undefined;
    const { stocks, total } = await this.inventoryStockService.getAllStock(pageNum, limitNum, {
      warehouseId,
      productId,
      lowStock,
      search,
      sortBy,
      sortOrder: normalizedOrder,
    });

    return {
      data: plainToInstance(InventoryStockResponseDto, stocks, {
        excludeExtraneousValues: true,
      }),
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Get stock by warehouse and product
   */
  @RequirePermission('inventory:read')
  @Get('warehouse/:warehouseId/product/:productId')
  @ApiOperation({
    summary: 'Get stock by warehouse and product',
    description: 'Retrieve stock level for a specific product in a specific warehouse',
  })
  async getStock(
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<InventoryStockResponseDto | null> {
    const stock = await this.inventoryStockService.getStock(warehouseId, productId);

    return stock
      ? plainToInstance(InventoryStockResponseDto, stock, {
          excludeExtraneousValues: true,
        })
      : null;
  }

  /**
   * Get all stock for a warehouse
   */
  @RequirePermission('inventory:read')
  @Get('warehouse/:warehouseId')
  @ApiReadAll({
    summary: 'Get stock by warehouse',
    description: 'Retrieve all stock levels for a warehouse',
    responseType: InventoryStockResponseDto,
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
    example: 50,
  })
  @ApiQuery({
    name: 'lowStock',
    required: false,
    type: Boolean,
    description: 'Filter by low stock items',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by product name or code',
  })
  async getStockByWarehouse(
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('lowStock') lowStock?: boolean,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<InventoryStockResponseDto>> {
    const { stocks, total } = await this.inventoryStockService.getStockByWarehouse(
      warehouseId,
      page,
      limit,
      {
        lowStock,
        search,
      },
    );

    return {
      data: plainToInstance(InventoryStockResponseDto, stocks, {
        excludeExtraneousValues: true,
      }),
      meta: {
        page: page ?? 1,
        limit: limit ?? 50,
        total,
        totalPages: Math.ceil(total / (limit ?? 50)),
      },
    };
  }

  /**
   * Get all stock for a product across warehouses
   */
  @RequirePermission('inventory:read')
  @Get('product/:productId')
  @ApiOperation({
    summary: 'Get stock by product',
    description: 'Retrieve stock levels for a product across all warehouses',
  })
  async getStockByProduct(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<InventoryStockResponseDto[]> {
    const stocks = await this.inventoryStockService.getStockByProduct(productId);

    return plainToInstance(InventoryStockResponseDto, stocks, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get low stock alerts
   */
  @RequirePermission('inventory:read')
  @Get('alerts/low-stock')
  @ApiOperation({
    summary: 'Get low stock alerts',
    description: 'Retrieve all products with stock below minimum level',
  })
  async getLowStockAlerts(
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<InventoryStockResponseDto[]> {
    const stocks = await this.inventoryStockService.getLowStockAlerts();

    return plainToInstance(InventoryStockResponseDto, stocks, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update stock
   */
  @RequirePermission('inventory:write')
  @Post('update')
  @ApiOperation({
    summary: 'Update stock',
    description: 'Add or remove stock (creates transaction record)',
  })
  async updateStock(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() updateDto: UpdateStockDto,
  ): Promise<InventoryStockResponseDto> {
    const stock = await this.inventoryStockService.updateStock(
      {
        ...updateDto,
      },
      currentUser.id,
    );

    return plainToInstance(InventoryStockResponseDto, stock, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Transfer stock between warehouses
   */
  @RequirePermission('stock:transfer')
  @Post('transfer')
  @ApiOperation({
    summary: 'Transfer stock between warehouses',
    description: 'Move stock from one warehouse to another',
  })
  async transferStock(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() transferDto: StockTransferDto,
  ): Promise<{ message: string }> {
    await this.inventoryStockService.transferStock(
      transferDto.fromWarehouseId,
      transferDto.toWarehouseId,
      transferDto.productId,
      transferDto.quantity,
      currentUser.id,
      transferDto.notes,
    );

    return { message: 'Stock transferred successfully' };
  }

  /**
   * Adjust stock (manual correction)
   */
  @RequirePermission('stock:adjust')
  @Post('adjust')
  @ApiOperation({
    summary: 'Adjust stock',
    description: 'Manually adjust stock quantity (for corrections)',
  })
  async adjustStock(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() adjustmentDto: StockAdjustmentDto,
  ): Promise<InventoryStockResponseDto> {
    const stock = await this.inventoryStockService.adjustStock(
      adjustmentDto.warehouseId,
      adjustmentDto.productId,
      adjustmentDto.newQuantity,
      currentUser.id,
      adjustmentDto.reason,
    );

    return plainToInstance(InventoryStockResponseDto, stock, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get total stock value
   */
  @RequirePermission('inventory:read')
  @Get('stats/total-value')
  @ApiOperation({
    summary: 'Get total stock value',
    description: 'Calculate total value of all stock',
  })
  async getTotalStockValue(
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<{ totalValue: number }> {
    const totalValue = await this.inventoryStockService.getTotalStockValue();

    return { totalValue };
  }

  /**
   * Get stock summary by warehouse
   */
  @RequirePermission('inventory:read')
  @Get('stats/by-warehouse')
  @ApiOperation({
    summary: 'Get stock summary by warehouse',
    description: 'Get stock statistics grouped by warehouse',
  })
  async getStockSummary(@CurrentUser() _currentUser: CurrentUserType): Promise<
    Array<{
      warehouseId: string;
      warehouseName: string;
      totalItems: number;
      totalValue: number;
    }>
  > {
    return this.inventoryStockService.getStockSummaryByWarehouse();
  }

  @RequirePermission('inventory:read')
  @Get('stats/top-low-stock')
  @ApiOperation({ summary: 'Top items that have crossed their minimum stock level (deficit DESC)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async statsTopLowStock(
    @CurrentUser() _currentUser: CurrentUserType,
    @Query('limit') limit?: string,
  ): Promise<TopItemsResponse> {
    return this.inventoryStatsService.topLowStock(limit);
  }

  /**
   * Get stock by ID
   */
  @RequirePermission('inventory:read')
  @Get(':id')
  @ApiOperation({
    summary: 'Get stock by ID',
    description: 'Retrieve a stock record by id',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<InventoryStockResponseDto> {
    const stock = await this.inventoryStockService.getStockById(id);
    return plainToInstance(InventoryStockResponseDto, stock, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update stock settings (thresholds)
   */
  @RequirePermission('inventory:write')
  @Patch(':id')
  @ApiOperation({
    summary: 'Update stock settings',
    description: 'Update stock thresholds (minimum, maximum, reorder levels)',
  })
  async updateStockSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateInventoryStockDto,
  ): Promise<InventoryStockResponseDto> {
    const stock = await this.inventoryStockService.getStockById(id);

    const updatedStock = await this.inventoryStockService.updateStockSettings(stock.id, updateDto);

    return plainToInstance(InventoryStockResponseDto, updatedStock, {
      excludeExtraneousValues: true,
    });
  }
}

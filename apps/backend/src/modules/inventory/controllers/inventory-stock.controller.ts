import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { type PaginatedResponse } from '@oneohm-epc/shared-types';
import { ApiReadAll, OrganizationContext } from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import {
  InventoryStockResponseDto,
  StockAdjustmentDto,
  StockTransferDto,
  UpdateStockDto,
} from '../dto';
import { InventoryStockService } from '../services';

/**
 * Inventory Stock Controller
 * Handles HTTP requests for stock management
 */
@ApiTags('Inventory - Stock Management')
@ApiBearerAuth()
@Controller('inventory-stock')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryStockController {
  constructor(private readonly inventoryStockService: InventoryStockService) {}

  /**
   * Get stock by warehouse and product
   */
  @Get('warehouse/:warehouseId/product/:productId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.FIELD_WORKER, Role.EXECUTION_ENGINEER)
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
  @Get('warehouse/:warehouseId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.FIELD_WORKER, Role.EXECUTION_ENGINEER)
  @ApiReadAll({
    summary: 'Get stock by warehouse',
    description: 'Retrieve all stock levels for a warehouse',
    responseType: InventoryStockResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.FIELD_WORKER, Role.EXECUTION_ENGINEER],
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
  @Get('product/:productId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.FIELD_WORKER, Role.EXECUTION_ENGINEER)
  @ApiOperation({
    summary: 'Get stock by product',
    description: 'Retrieve stock levels for a product across all warehouses',
  })
  async getStockByProduct(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<InventoryStockResponseDto[]> {
    const stocks = await this.inventoryStockService.getStockByProduct(productId, organizationId);

    return plainToInstance(InventoryStockResponseDto, stocks, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get low stock alerts
   */
  @Get('alerts/low-stock')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Get low stock alerts',
    description: 'Retrieve all products with stock below minimum level',
  })
  async getLowStockAlerts(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<InventoryStockResponseDto[]> {
    const stocks = await this.inventoryStockService.getLowStockAlerts(organizationId);

    return plainToInstance(InventoryStockResponseDto, stocks, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update stock
   */
  @Post('update')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.FIELD_WORKER)
  @ApiOperation({
    summary: 'Update stock',
    description: 'Add or remove stock (creates transaction record)',
  })
  async updateStock(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() updateDto: UpdateStockDto,
  ): Promise<InventoryStockResponseDto> {
    const stock = await this.inventoryStockService.updateStock(
      {
        ...updateDto,
        organizationId: organizationId,
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
  @Post('transfer')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Transfer stock between warehouses',
    description: 'Move stock from one warehouse to another',
  })
  async transferStock(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() transferDto: StockTransferDto,
  ): Promise<{ message: string }> {
    await this.inventoryStockService.transferStock(
      organizationId,
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
  @Post('adjust')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Adjust stock',
    description: 'Manually adjust stock quantity (for corrections)',
  })
  async adjustStock(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() adjustmentDto: StockAdjustmentDto,
  ): Promise<InventoryStockResponseDto> {
    const stock = await this.inventoryStockService.adjustStock(
      organizationId,
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
  @Get('stats/total-value')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Get total stock value',
    description: 'Calculate total value of all stock in organization',
  })
  async getTotalStockValue(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<{ totalValue: number }> {
    const totalValue = await this.inventoryStockService.getTotalStockValue(organizationId);

    return { totalValue };
  }

  /**
   * Get stock summary by warehouse
   */
  @Get('stats/by-warehouse')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Get stock summary by warehouse',
    description: 'Get stock statistics grouped by warehouse',
  })
  async getStockSummary(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<
    Array<{
      warehouseId: string;
      warehouseName: string;
      totalItems: number;
      totalValue: number;
    }>
  > {
    return this.inventoryStockService.getStockSummaryByWarehouse(organizationId);
  }
}

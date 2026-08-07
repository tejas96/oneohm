import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InventoryTransactionType } from '@tejas96/shared/types';
import { plainToInstance } from 'class-transformer';

import { ApiReadAll, ApiReadOne } from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { PermissionGuard } from '../../iam/guards/permission.guard';
import { InventoryTransactionResponseDto } from '../dto';
import type { TrendResponse } from '../dto/common';
import { InventoryStatsService, InventoryTransactionService } from '../services';

/**
 * Inventory Transaction Controller
 * Read-only HTTP API for the transaction ledger.
 * Static sub-paths are declared before :id.
 */
@ApiTags('Inventory - Transactions')
@ApiBearerAuth()
@Controller('inventory-transactions')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class InventoryTransactionController {
  constructor(
    private readonly inventoryTransactionService: InventoryTransactionService,
    private readonly inventoryStatsService: InventoryStatsService,
  ) {}

  // ==================== Static Routes ====================

  /**
   * Get summary by transaction type
   */
  @RequirePermission('inventory:read')
  @Get('stats/summary')
  @ApiOperation({ summary: 'Get transaction summary by type' })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  async getSummary(
    @CurrentUser() _currentUser: CurrentUserType,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.inventoryTransactionService.getSummaryByType(fromDate, toDate);
  }

  @RequirePermission('inventory:read')
  @Get('stats/by-type-trend')
  @ApiOperation({ summary: 'Transactions count bucketed by date with per-type series' })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiQuery({ name: 'bucket', required: false, enum: ['day', 'week'] })
  async statsByTypeTrend(
    @CurrentUser() _currentUser: CurrentUserType,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('bucket') bucket?: string,
  ): Promise<TrendResponse> {
    return this.inventoryStatsService.transactionsByTypeTrend(
      fromDate,
      toDate,
      bucket,
    );
  }

  /**
   * Get recent transactions
   */
  @RequirePermission('inventory:read')
  @Get('recent')
  @ApiOperation({ summary: 'Get most recent transactions (up to 10)' })
  async getRecent(
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<InventoryTransactionResponseDto[]> {
    const txns = await this.inventoryTransactionService.getRecentTransactions();
    return plainToInstance(InventoryTransactionResponseDto, txns, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get transactions for a specific product
   */
  @RequirePermission('inventory:read')
  @Get('product/:productId/history')
  @ApiOperation({ summary: 'Get movement history for a product' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getProductHistory(
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{
    data: InventoryTransactionResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const {
      transactions,
      total,
      page: p,
      limit: l,
    } = await this.inventoryTransactionService.findByProduct(
      productId,
      page,
      limit,
    );

    return {
      data: plainToInstance(InventoryTransactionResponseDto, transactions, {
        excludeExtraneousValues: true,
      }),
      meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
    };
  }

  // ==================== Collection Routes ====================

  /**
   * Get all transactions with filters
   */
  @RequirePermission('inventory:read')
  @Get()
  @ApiReadAll({
    summary: 'Get all inventory transactions',
    responseType: InventoryTransactionResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'transactionType',
    required: false,
    enum: Object.values(InventoryTransactionType),
  })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiQuery({ name: 'referenceType', required: false, type: String })
  @ApiQuery({ name: 'referenceId', required: false, type: String })
  async findAll(
    @CurrentUser() _currentUser: CurrentUserType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('transactionType') transactionType?: InventoryTransactionType,
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('referenceType') referenceType?: string,
    @Query('referenceId') referenceId?: string,
  ): Promise<{
    data: InventoryTransactionResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const {
      transactions,
      total,
      page: p,
      limit: l,
    } = await this.inventoryTransactionService.findAll(page, limit, {
      transactionType,
      warehouseId,
      productId,
      fromDate,
      toDate,
      referenceType,
      referenceId,
    });

    return {
      data: plainToInstance(InventoryTransactionResponseDto, transactions, {
        excludeExtraneousValues: true,
      }),
      meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
    };
  }

  // ==================== Item Routes ====================

  /**
   * Get transaction by ID
   */
  @RequirePermission('inventory:read')
  @Get(':id')
  @ApiReadOne({ summary: 'Get transaction by ID', responseType: InventoryTransactionResponseDto })
  async findOne(
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InventoryTransactionResponseDto> {
    const txn = await this.inventoryTransactionService.findById(id);
    return plainToInstance(InventoryTransactionResponseDto, txn, {
      excludeExtraneousValues: true,
    });
  }
}

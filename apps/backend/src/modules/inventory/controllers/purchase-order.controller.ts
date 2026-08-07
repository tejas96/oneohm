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
import { PaymentStatus, PurchaseOrderStatus } from '@tejas96/shared/types';
import { parsePaginationParams } from '@tejas96/shared/utils';
import { plainToInstance } from 'class-transformer';

import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate
} from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { PermissionGuard } from '../../iam/guards/permission.guard';
import {
  BulkCancelDto,
  BulkIdsDto,
  BulkOperationResultDto,
  CreatePurchaseOrderDto,
  PurchaseOrderResponseDto,
  ReceivePurchaseOrderDto,
  RecordPaymentDto,
  UpdatePurchaseOrderDto,
} from '../dto';
import type { TopItemsResponse, TrendResponse } from '../dto/common';
import { InventoryBulkService, PurchaseOrderService, PurchaseOrderStatsService } from '../services';

/**
 * Purchase Order Controller
 * IMPORTANT: Static sub-paths (stats/summary, overdue/list) are declared BEFORE :id
 * to prevent NestJS from treating them as UUID params.
 */
@ApiTags('Inventory - Purchase Orders')
@ApiBearerAuth()
@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PurchaseOrderController {
  constructor(
    private readonly purchaseOrderService: PurchaseOrderService,
    private readonly inventoryBulkService: InventoryBulkService,
    private readonly purchaseOrderStatsService: PurchaseOrderStatsService,
  ) {}

  // ==================== Static Routes (MUST come before :id) ====================

  /**
   * Bulk approve POs (best-effort: returns per-id succeeded/failed at HTTP 200)
   */
  @RequirePermission('purchase-order:approve')
  @Post('bulk/approve')
  @ApiOperation({
    summary: 'Bulk approve purchase orders (best-effort)',
    description:
      'Returns { succeeded: string[], failed: { id, reason }[] } at HTTP 200. Failures on one id do not roll back the rest.',
  })
  async bulkApprove(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() body: BulkIdsDto,
  ): Promise<BulkOperationResultDto> {
    return this.inventoryBulkService.approvePurchaseOrders(
      body.ids,
      currentUser.id,
    );
  }

  /**
   * Bulk cancel POs (best-effort)
   */
  @RequirePermission('purchase-order:write')
  @Post('bulk/cancel')
  @ApiOperation({
    summary: 'Bulk cancel purchase orders (best-effort)',
    description:
      'Returns { succeeded: string[], failed: { id, reason }[] } at HTTP 200. Each id is cancelled independently.',
  })
  async bulkCancel(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() body: BulkCancelDto,
  ): Promise<BulkOperationResultDto> {
    return this.inventoryBulkService.cancelPurchaseOrders(
      body.ids,
      body.reason,
      currentUser.id,
    );
  }

  /**
   * Get purchase order statistics
   */
  @RequirePermission('inventory:read')
  @Get('stats/summary')
  @ApiOperation({
    summary: 'Get purchase order statistics',
    description: 'Get PO count by status and pending approvals',
  })
  async getStatistics(
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<{
    total: number;
    byStatus: Record<PurchaseOrderStatus, number>;
    pendingApprovals: number;
    overdueCount: number;
  }> {
    return this.purchaseOrderService.getStatistics();
  }

  @RequirePermission('inventory:read')
  @Get('stats/spend-trend')
  @ApiOperation({ summary: 'PO spend trend bucketed by po_date (CANCELLED excluded)' })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiQuery({ name: 'bucket', required: false, enum: ['day', 'week'] })
  async statsSpendTrend(
    @CurrentUser() _currentUser: CurrentUserType,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('bucket') bucket?: string,
  ): Promise<TrendResponse> {
    return this.purchaseOrderStatsService.spendTrend(fromDate, toDate, bucket);
  }

  @RequirePermission('inventory:read')
  @Get('stats/top-vendors')
  @ApiOperation({ summary: 'Top vendors by PO spend in window' })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async statsTopVendors(
    @CurrentUser() _currentUser: CurrentUserType,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('limit') limit?: string,
  ): Promise<TopItemsResponse> {
    return this.purchaseOrderStatsService.topVendors(fromDate, toDate, limit);
  }

  @RequirePermission('inventory:read')
  @Get('stats/spend-by-warehouse')
  @ApiOperation({ summary: 'PO spend grouped by warehouse in window' })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async statsSpendByWarehouse(
    @CurrentUser() _currentUser: CurrentUserType,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('limit') limit?: string,
  ): Promise<TopItemsResponse> {
    return this.purchaseOrderStatsService.spendByWarehouse(fromDate, toDate, limit);
  }

  @RequirePermission('inventory:read')
  @Get('stats/outstanding-by-vendor')
  @ApiOperation({ summary: 'Outstanding balance per vendor (now-snapshot)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async statsOutstandingByVendor(
    @CurrentUser() _currentUser: CurrentUserType,
    @Query('limit') limit?: string,
  ): Promise<TopItemsResponse> {
    return this.purchaseOrderStatsService.outstandingByVendor(limit);
  }

  /**
   * Get overdue purchase orders
   */
  @RequirePermission('inventory:read')
  @Get('overdue/list')
  @ApiOperation({
    summary: 'Get overdue purchase orders',
    description: 'Get list of purchase orders past expected delivery date',
  })
  async getOverdue(
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<PurchaseOrderResponseDto[]> {
    const pos = await this.purchaseOrderService.getOverduePurchaseOrders();

    return plainToInstance(PurchaseOrderResponseDto, pos, {
      excludeExtraneousValues: true,
    });
  }

  // ==================== Collection Routes ====================

  /**
   * Create a new purchase order
   */
  @RequirePermission('purchase-order:write')
  @Post()
  @ApiCreate({
    summary: 'Create a new purchase order',
    description: 'Creates a new purchase order for procurement',
    responseType: PurchaseOrderResponseDto,
  })
  async create(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.purchaseOrderService.create(createDto, currentUser.id);

    return plainToInstance(PurchaseOrderResponseDto, po, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all purchase orders with filters
   */
  @RequirePermission('inventory:read')
  @Get()
  @ApiReadAll({
    summary: 'Get all purchase orders',
    description: 'Retrieve all purchase orders with optional filters and pagination',
    responseType: PurchaseOrderResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: Object.values(PurchaseOrderStatus) })
  @ApiQuery({ name: 'paymentStatus', required: false, enum: Object.values(PaymentStatus) })
  @ApiQuery({ name: 'vendorId', required: false, type: String })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @CurrentUser() _currentUser: CurrentUserType,
    @Query() query: Record<string, string>,
    @Query('status') status?: PurchaseOrderStatus,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
    @Query('vendorId') vendorId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('projectId') projectId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('search') search?: string,
  ): Promise<{
    data: PurchaseOrderResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page: pageNum, limit: limitNum } = parsePaginationParams(query.page, query.limit);
    const { purchaseOrders, total } = await this.purchaseOrderService.findAll(
      pageNum,
      limitNum,
      { status, paymentStatus, vendorId, warehouseId, projectId, fromDate, toDate, search },
    );

    return {
      data: plainToInstance(PurchaseOrderResponseDto, purchaseOrders, {
        excludeExtraneousValues: true,
      }),
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  // ==================== Item Routes (:id — MUST come after static routes) ====================

  /**
   * Get purchase order by ID
   */
  @RequirePermission('inventory:read')
  @Get(':id')
  @ApiReadOne({
    summary: 'Get purchase order by ID',
    description: 'Retrieve a specific purchase order by its ID',
    responseType: PurchaseOrderResponseDto,
  })
  async findOne(
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.purchaseOrderService.findById(id);

    return plainToInstance(PurchaseOrderResponseDto, po, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update purchase order
   */
  @RequirePermission('purchase-order:write')
  @Patch(':id')
  @ApiUpdate({
    summary: 'Update purchase order',
    description: 'Update an existing purchase order (draft/pending only)',
    responseType: PurchaseOrderResponseDto,
  })
  async update(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.purchaseOrderService.update(
      id,
      updateDto,
      currentUser.id,
    );

    return plainToInstance(PurchaseOrderResponseDto, po, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Delete purchase order
   */
  @RequirePermission('purchase-order:write')
  @Delete(':id')
  @ApiDelete({
    summary: 'Delete purchase order',
    description: 'Soft delete a purchase order (draft only)',
  })
  async delete(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.purchaseOrderService.delete(id, currentUser.id);

    return { message: 'Purchase order deleted successfully' };
  }

  /**
   * Submit purchase order for approval
   */
  @RequirePermission('purchase-order:submit')
  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit purchase order for approval' })
  async submitForApproval(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.purchaseOrderService.submitForApproval(
      id,
      currentUser.id,
    );

    return plainToInstance(PurchaseOrderResponseDto, po, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Approve purchase order
   */
  @RequirePermission('purchase-order:approve')
  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve purchase order' })
  async approve(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.purchaseOrderService.approve(id, currentUser.id);

    return plainToInstance(PurchaseOrderResponseDto, po, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Send purchase order to vendor
   */
  @RequirePermission('purchase-order:send')
  @Post(':id/send')
  @ApiOperation({ summary: 'Send purchase order to vendor' })
  async send(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.purchaseOrderService.send(id, currentUser.id);

    return plainToInstance(PurchaseOrderResponseDto, po, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Receive purchase order items
   */
  @RequirePermission('purchase-order:receive')
  @Post(':id/receive')
  @ApiOperation({ summary: 'Receive purchase order (full or partial)' })
  async receive(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() receiveDto: ReceivePurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.purchaseOrderService.receive(
      id,
      receiveDto,
      currentUser.id,
    );

    return plainToInstance(PurchaseOrderResponseDto, po, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Record a payment against a PO. Updates paid_amount and re-derives
   * payment_status (pending | partial | paid). Disallowed for draft and
   * cancelled POs.
   */
  @RequirePermission('purchase-order:write')
  @Post(':id/record-payment')
  @ApiOperation({ summary: 'Record a payment against a purchase order' })
  async recordPayment(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RecordPaymentDto,
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.purchaseOrderService.recordPayment(
      id,
      body.amount,
      currentUser.id,
      body.notes,
    );
    return plainToInstance(PurchaseOrderResponseDto, po, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Cancel purchase order
   */
  @RequirePermission('purchase-order:write')
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel purchase order' })
  async cancel(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.purchaseOrderService.cancel(id, reason, currentUser.id);

    return plainToInstance(PurchaseOrderResponseDto, po, {
      excludeExtraneousValues: true,
    });
  }
}

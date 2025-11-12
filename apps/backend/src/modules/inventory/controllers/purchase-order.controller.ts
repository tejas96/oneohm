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
import { PaymentStatus, PurchaseOrderStatus } from '@oneohm-epc/shared-types';
import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
} from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import {
  CreatePurchaseOrderDto,
  PurchaseOrderResponseDto,
  ReceivePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from '../dto';
import { PurchaseOrderService } from '../services';

/**
 * Purchase Order Controller
 * Handles HTTP requests for purchase order management
 */
@ApiTags('Inventory - Purchase Orders')
@ApiBearerAuth()
@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseOrderController {
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

  /**
   * Create a new purchase order
   */
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiCreate({
    summary: 'Create a new purchase order',
    description: 'Creates a new purchase order for procurement',
    responseType: PurchaseOrderResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
  })
  async create(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.purchaseOrderService.create(
      currentUser.organizationId,
      createDto,
      currentUser.id,
    );

    return plainToInstance(PurchaseOrderResponseDto, po, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all purchase orders with filters
   */
  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.FIELD_WORKER, Role.EXECUTION_ENGINEER)
  @ApiReadAll({
    summary: 'Get all purchase orders',
    description: 'Retrieve all purchase orders with optional filters and pagination',
    responseType: PurchaseOrderResponseDto,
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
    example: 20,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: Object.values(PurchaseOrderStatus),
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'paymentStatus',
    required: false,
    enum: Object.values(PaymentStatus),
    description: 'Filter by payment status',
  })
  @ApiQuery({
    name: 'vendorId',
    required: false,
    type: String,
    description: 'Filter by vendor',
  })
  @ApiQuery({
    name: 'warehouseId',
    required: false,
    type: String,
    description: 'Filter by warehouse',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    type: String,
    description: 'Filter by project',
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
    description: 'Search by PO number or vendor name',
  })
  async findAll(
    @CurrentUser() currentUser: CurrentUserType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
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
    const { purchaseOrders, total } = await this.purchaseOrderService.findAll(
      currentUser.organizationId,
      page,
      limit,
      {
        status,
        paymentStatus,
        vendorId,
        warehouseId,
        projectId,
        fromDate,
        toDate,
        search,
      },
    );

    return {
      data: plainToInstance(PurchaseOrderResponseDto, purchaseOrders, {
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
   * Get purchase order by ID
   */
  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.FIELD_WORKER, Role.EXECUTION_ENGINEER)
  @ApiReadOne({
    summary: 'Get purchase order by ID',
    description: 'Retrieve a specific purchase order by its ID',
    responseType: PurchaseOrderResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.FIELD_WORKER, Role.EXECUTION_ENGINEER],
  })
  async findOne(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.purchaseOrderService.findById(id, currentUser.organizationId);

    return plainToInstance(PurchaseOrderResponseDto, po, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update purchase order
   */
  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiUpdate({
    summary: 'Update purchase order',
    description: 'Update an existing purchase order (draft/pending only)',
    responseType: PurchaseOrderResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
  })
  async update(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.purchaseOrderService.update(
      id,
      currentUser.organizationId,
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
  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiDelete({
    summary: 'Delete purchase order',
    description: 'Soft delete a purchase order (draft only)',
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async delete(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.purchaseOrderService.delete(id, currentUser.organizationId, currentUser.id);

    return { message: 'Purchase order deleted successfully' };
  }

  /**
   * Submit purchase order for approval
   */
  @Post(':id/submit')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Submit purchase order for approval',
    description: 'Submit a draft purchase order for approval',
  })
  async submitForApproval(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.purchaseOrderService.submitForApproval(
      id,
      currentUser.organizationId,
      currentUser.id,
    );

    return plainToInstance(PurchaseOrderResponseDto, po, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Approve purchase order
   */
  @Post(':id/approve')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary: 'Approve purchase order',
    description: 'Approve a pending purchase order',
  })
  async approve(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.purchaseOrderService.approve(
      id,
      currentUser.organizationId,
      currentUser.id,
    );

    return plainToInstance(PurchaseOrderResponseDto, po, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Send purchase order to vendor
   */
  @Post(':id/send')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Send purchase order',
    description: 'Send an approved purchase order to vendor',
  })
  async send(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.purchaseOrderService.send(
      id,
      currentUser.organizationId,
      currentUser.id,
    );

    return plainToInstance(PurchaseOrderResponseDto, po, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Receive purchase order items
   */
  @Post(':id/receive')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.FIELD_WORKER)
  @ApiOperation({
    summary: 'Receive purchase order',
    description: 'Receive items from a purchase order (full or partial)',
  })
  async receive(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() receiveDto: ReceivePurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.purchaseOrderService.receive(
      id,
      currentUser.organizationId,
      receiveDto,
      currentUser.id,
    );

    return plainToInstance(PurchaseOrderResponseDto, po, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Cancel purchase order
   */
  @Post(':id/cancel')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Cancel purchase order',
    description: 'Cancel a purchase order',
  })
  async cancel(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.purchaseOrderService.cancel(
      id,
      currentUser.organizationId,
      reason,
      currentUser.id,
    );

    return plainToInstance(PurchaseOrderResponseDto, po, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get purchase order statistics
   */
  @Get('stats/summary')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Get purchase order statistics',
    description: 'Get PO count by status and pending approvals',
  })
  async getStatistics(
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<{
    totalOrders: number;
    byStatus: Record<PurchaseOrderStatus, number>;
    totalValue: number;
    pendingValue: number;
  }> {
    return this.purchaseOrderService.getStatistics(currentUser.organizationId);
  }

  /**
   * Get overdue purchase orders
   */
  @Get('overdue/list')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Get overdue purchase orders',
    description: 'Get list of purchase orders past expected delivery date',
  })
  async getOverdue(@CurrentUser() currentUser: CurrentUserType): Promise<PurchaseOrderResponseDto[]> {
    const pos = await this.purchaseOrderService.getOverduePurchaseOrders(
      currentUser.organizationId,
    );

    return plainToInstance(PurchaseOrderResponseDto, pos, {
      excludeExtraneousValues: true,
    });
  }
}


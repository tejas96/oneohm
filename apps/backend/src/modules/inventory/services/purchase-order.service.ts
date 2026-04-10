import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus, PurchaseOrderStatus } from '@oneohm-epc/shared/types';

import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { CreatePurchaseOrderDto, ReceivePurchaseOrderDto, UpdatePurchaseOrderDto } from '../dto';
import { InventoryStockService } from './inventory-stock.service';
import { PurchaseOrderEntity } from '../entities/purchase-order.entity';
import {
  PurchaseOrderItemRepository,
  PurchaseOrderRepository,
  VendorRepository,
  WarehouseRepository,
} from '../repositories';

/**
 * Purchase Order Service
 * Business logic for purchase order management
 */
@Injectable()
export class PurchaseOrderService {
  constructor(
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
    private readonly purchaseOrderItemRepository: PurchaseOrderItemRepository,
    private readonly vendorRepository: VendorRepository,
    private readonly warehouseRepository: WarehouseRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly inventoryStockService: InventoryStockService,
  ) {}

  /**
   * Create a new purchase order
   */
  async create(
    organizationId: string,
    createDto: CreatePurchaseOrderDto,
    createdBy: string,
  ): Promise<PurchaseOrderEntity> {
    // Verify organization exists
    const org = await this.organizationRepository.findOneById(organizationId);
    if (!org) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    // Verify vendor exists
    await this.vendorRepository.findById(createDto.vendorId, organizationId);

    // Verify warehouse exists if provided
    if (createDto.warehouseId) {
      await this.warehouseRepository.findById(createDto.warehouseId, organizationId);
    }

    // Generate PO number
    const poNumber = await this.purchaseOrderRepository.generatePoNumber(organizationId);

    // Calculate totals
    let subtotal = 0;
    for (const item of createDto.items) {
      const itemTotal = item.unitPrice * item.orderedQuantity;
      subtotal += itemTotal;
    }

    const taxAmount = createDto.taxAmount ?? 0;
    const totalAmount = subtotal + taxAmount;

    // Create purchase order
    const po = await this.purchaseOrderRepository.create({
      organizationId,
      vendorId: createDto.vendorId,
      warehouseId: createDto.warehouseId,
      projectId: createDto.projectId,
      poNumber,
      poDate: createDto.poDate ? new Date(createDto.poDate) : new Date(),
      poType: createDto.poType,
      expectedDeliveryDate: createDto.expectedDeliveryDate
        ? new Date(createDto.expectedDeliveryDate)
        : undefined,
      subtotal,
      taxAmount,
      totalAmount,
      paymentTerms: createDto.paymentTerms,
      paymentStatus: PaymentStatus.PENDING,
      status: createDto.status ?? PurchaseOrderStatus.DRAFT,
      notes: createDto.notes,
      termsConditions: createDto.termsConditions,
      createdBy,
    });

    // Create PO items
    const items = createDto.items.map((item) => ({
      purchaseOrderId: po.id,
      productId: item.productId,
      orderedQuantity: item.orderedQuantity,
      receivedQuantity: 0,
      unitPrice: item.unitPrice,
      notes: item.notes,
    }));

    await this.purchaseOrderItemRepository.createMany(items);

    return this.purchaseOrderRepository.findById(po.id, organizationId);
  }

  /**
   * Find all purchase orders with filters
   */
  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters?: {
      status?: PurchaseOrderStatus;
      paymentStatus?: PaymentStatus;
      vendorId?: string;
      warehouseId?: string;
      projectId?: string;
      fromDate?: string;
      toDate?: string;
      search?: string;
    },
  ) {
    return this.purchaseOrderRepository.findAll(organizationId, page, limit, filters);
  }

  /**
   * Find purchase order by ID
   */
  async findById(id: string, organizationId: string): Promise<PurchaseOrderEntity> {
    return this.purchaseOrderRepository.findById(id, organizationId);
  }

  /**
   * Update purchase order
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdatePurchaseOrderDto,
    updatedBy: string,
  ): Promise<PurchaseOrderEntity> {
    const po = await this.purchaseOrderRepository.findById(id, organizationId);

    // Only allow updates if PO is in draft or pending approval status
    if (
      po.status !== PurchaseOrderStatus.DRAFT &&
      po.status !== PurchaseOrderStatus.PENDING_APPROVAL
    ) {
      throw new BadRequestException(`Cannot update purchase order with status ${po.status}`);
    }

    return this.purchaseOrderRepository.update(id, organizationId, {
      ...updateDto,
      updatedBy,
    });
  }

  /**
   * Delete purchase order
   */
  async delete(id: string, organizationId: string, deletedBy: string): Promise<void> {
    const po = await this.purchaseOrderRepository.findById(id, organizationId);

    // Only allow deletion if PO is in draft status
    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Only draft purchase orders can be deleted');
    }

    await this.purchaseOrderRepository.softDelete(id, organizationId, deletedBy);
  }

  /**
   * Submit purchase order for approval
   */
  async submitForApproval(
    id: string,
    organizationId: string,
    updatedBy: string,
  ): Promise<PurchaseOrderEntity> {
    const po = await this.purchaseOrderRepository.findById(id, organizationId);

    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Only draft purchase orders can be submitted');
    }

    return this.purchaseOrderRepository.update(id, organizationId, {
      status: PurchaseOrderStatus.PENDING_APPROVAL,
      updatedBy,
    });
  }

  /**
   * Approve purchase order
   */
  async approve(
    id: string,
    organizationId: string,
    updatedBy: string,
  ): Promise<PurchaseOrderEntity> {
    const po = await this.purchaseOrderRepository.findById(id, organizationId);

    if (po.status !== PurchaseOrderStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Only pending purchase orders can be approved');
    }

    return this.purchaseOrderRepository.update(id, organizationId, {
      status: PurchaseOrderStatus.APPROVED,
      updatedBy,
    });
  }

  /**
   * Send purchase order to vendor
   */
  async send(id: string, organizationId: string, updatedBy: string): Promise<PurchaseOrderEntity> {
    const po = await this.purchaseOrderRepository.findById(id, organizationId);

    if (po.status !== PurchaseOrderStatus.APPROVED) {
      throw new BadRequestException('Only approved purchase orders can be sent');
    }

    return this.purchaseOrderRepository.update(id, organizationId, {
      status: PurchaseOrderStatus.SENT,
      updatedBy,
    });
  }

  /**
   * Receive purchase order (full or partial)
   */
  async receive(
    id: string,
    organizationId: string,
    receiveDto: ReceivePurchaseOrderDto,
    performedBy: string,
  ): Promise<PurchaseOrderEntity> {
    const po = await this.purchaseOrderRepository.findById(id, organizationId);

    if (!po.warehouseId) {
      throw new BadRequestException('Purchase order must have a warehouse assigned');
    }

    // Update received quantities for each item
    for (const receivedItem of receiveDto.items) {
      const item = await this.purchaseOrderItemRepository.findById(receivedItem.itemId);

      if (item.purchaseOrderId !== id) {
        throw new BadRequestException('Invalid item ID');
      }

      const newReceivedQuantity = item.receivedQuantity + receivedItem.quantityReceived;

      if (newReceivedQuantity > item.orderedQuantity) {
        throw new BadRequestException('Received quantity cannot exceed ordered quantity');
      }

      // Update item received quantity
      await this.purchaseOrderItemRepository.update(receivedItem.itemId, {
        receivedQuantity: newReceivedQuantity,
      });

      // Update stock
      await this.inventoryStockService.addStock(
        organizationId,
        po.warehouseId,
        item.productId,
        receivedItem.quantityReceived,
        'purchase_order',
        po.id,
        performedBy,
        `Received from PO ${po.poNumber}`,
      );
    }

    // Check if all items are fully received
    const items = await this.purchaseOrderItemRepository.findByPurchaseOrder(id);
    const allFullyReceived = items.every((item) => item.receivedQuantity >= item.orderedQuantity);
    const anyPartiallyReceived = items.some(
      (item) => item.receivedQuantity > 0 && item.receivedQuantity < item.orderedQuantity,
    );

    let newStatus = po.status;
    if (allFullyReceived) {
      newStatus = PurchaseOrderStatus.RECEIVED;
    } else if (anyPartiallyReceived) {
      newStatus = PurchaseOrderStatus.PARTIALLY_RECEIVED;
    }

    // Update PO status and actual delivery date
    return this.purchaseOrderRepository.update(id, organizationId, {
      status: newStatus,
      actualDeliveryDate: receiveDto.receivingDate
        ? new Date(receiveDto.receivingDate)
        : new Date(),
      updatedBy: performedBy,
    });
  }

  /**
   * Cancel purchase order
   */
  async cancel(
    id: string,
    organizationId: string,
    reason: string,
    updatedBy: string,
  ): Promise<PurchaseOrderEntity> {
    const po = await this.purchaseOrderRepository.findById(id, organizationId);

    if (po.status === PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('Cannot cancel a received purchase order');
    }

    return this.purchaseOrderRepository.update(id, organizationId, {
      status: PurchaseOrderStatus.CANCELLED,
      notes: `${po.notes ?? ''}\nCancelled: ${reason}`,
      updatedBy,
    });
  }

  /**
   * Get purchase order statistics
   */
  async getStatistics(organizationId: string) {
    const [countByStatus, pendingApprovals, overduePos] = await Promise.all([
      this.purchaseOrderRepository.countByStatus(organizationId),
      this.purchaseOrderRepository.getPendingApprovalsCount(organizationId),
      this.purchaseOrderRepository.getOverduePurchaseOrders(organizationId),
    ]);

    return {
      total: Object.values(countByStatus).reduce((sum, count) => sum + count, 0),
      byStatus: countByStatus,
      pendingApprovals,
      overdueCount: overduePos.length,
    };
  }

  /**
   * Get overdue purchase orders
   */
  async getOverduePurchaseOrders(organizationId: string): Promise<PurchaseOrderEntity[]> {
    return this.purchaseOrderRepository.getOverduePurchaseOrders(organizationId);
  }
}

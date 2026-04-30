import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { PaymentStatus, PurchaseOrderStatus } from '@oneohm-epc/shared/types';
import { DataSource } from 'typeorm';

import { ProductRepository } from '../../master-data/repositories';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { ProjectRepository } from '../../projects/repositories';
import { CreatePurchaseOrderDto, ReceivePurchaseOrderDto, UpdatePurchaseOrderDto } from '../dto';
import { PurchaseOrderItemEntity } from '../entities/purchase-order-item.entity';
import { PurchaseOrderEntity } from '../entities/purchase-order.entity';
import {
  PurchaseOrderItemRepository,
  PurchaseOrderRepository,
  VendorRepository,
  WarehouseRepository,
} from '../repositories';
import { InventoryStockService } from './inventory-stock.service';

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
    private readonly projectRepository: ProjectRepository,
    private readonly productRepository: ProductRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
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

    if (createDto.projectId) {
      await this.projectRepository.findById(createDto.projectId, organizationId);
    }

    for (const item of createDto.items) {
      const product = await this.productRepository.findById(item.productId, organizationId);
      if (!product) {
        throw new NotFoundException(`Product with ID ${item.productId} not found`);
      }
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of createDto.items) {
      const itemTotal = item.unitPrice * item.orderedQuantity;
      subtotal += itemTotal;
    }

    const taxAmount = createDto.taxAmount ?? 0;
    const totalAmount = subtotal + taxAmount;

    const lineItems = createDto.items.map((item) => {
      const taxRate = item.taxRate ?? 0;
      const lineTotal = item.unitPrice * item.orderedQuantity * (1 + taxRate / 100);
      return { item, taxRate, lineTotal };
    });

    const po = await this.dataSource.transaction(async (manager) => {
      const poNumberTx = await this.purchaseOrderRepository.generatePoNumber(
        organizationId,
        manager,
      );
      const poRepo = manager.getRepository(PurchaseOrderEntity);
      const saved = await poRepo.save(
        poRepo.create({
          organizationId,
          vendorId: createDto.vendorId,
          warehouseId: createDto.warehouseId,
          projectId: createDto.projectId,
          poNumber: poNumberTx,
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
          status: PurchaseOrderStatus.DRAFT,
          notes: createDto.notes,
          termsConditions: createDto.termsConditions,
          createdBy,
        }),
      );

      const itemRepo = manager.getRepository(PurchaseOrderItemEntity);
      const rows = lineItems.map(({ item, taxRate, lineTotal }) =>
        itemRepo.create({
          purchaseOrderId: saved.id,
          productId: item.productId,
          orderedQuantity: item.orderedQuantity,
          receivedQuantity: 0,
          unitPrice: item.unitPrice,
          taxRate,
          lineTotal,
          notes: item.notes,
        }),
      );
      await itemRepo.save(rows);
      return saved;
    });

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

    await this.purchaseOrderItemRepository.deleteByPurchaseOrder(id);
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
    await this.dataSource.transaction(async (manager) => {
      const poRepo = manager.getRepository(PurchaseOrderEntity);
      const itemRepo = manager.getRepository(PurchaseOrderItemEntity);

      const orderRow = await poRepo
        .createQueryBuilder('po')
        .where('po.id = :id', { id })
        .andWhere('po.organizationId = :organizationId', { organizationId })
        .andWhere('po.deletedAt IS NULL')
        .setLock('pessimistic_write')
        .getOne();

      if (!orderRow) {
        throw new NotFoundException(`Purchase Order with ID ${id} not found`);
      }

      const receivableStatuses = [
        PurchaseOrderStatus.APPROVED,
        PurchaseOrderStatus.SENT,
        PurchaseOrderStatus.CONFIRMED,
        PurchaseOrderStatus.PARTIALLY_RECEIVED,
      ];
      if (!receivableStatuses.includes(orderRow.status)) {
        throw new BadRequestException(
          `Cannot receive PO in status ${orderRow.status}. PO must be in APPROVED, SENT, CONFIRMED, or PARTIALLY_RECEIVED status.`,
        );
      }

      if (!orderRow.warehouseId) {
        throw new BadRequestException('Purchase order must have a warehouse assigned');
      }

      const receiveLines: {
        itemId: string;
        productId: string;
        quantityReceived: number;
      }[] = [];

      for (const receivedItem of receiveDto.items) {
        const row = await itemRepo
          .createQueryBuilder('item')
          .where('item.id = :itemId', { itemId: receivedItem.itemId })
          .setLock('pessimistic_write')
          .getOne();

        if (!row) {
          throw new NotFoundException(
            `Purchase Order Item with ID ${receivedItem.itemId} not found`,
          );
        }
        if (row.purchaseOrderId !== id) {
          throw new BadRequestException('Invalid item ID');
        }

        const currentReceived = Number(row.receivedQuantity);
        const incomingQuantity = Number(receivedItem.quantityReceived);
        const orderedQuantity = Number(row.orderedQuantity);
        const newReceivedQuantity = currentReceived + incomingQuantity;

        if (newReceivedQuantity > orderedQuantity) {
          throw new BadRequestException('Received quantity cannot exceed ordered quantity');
        }

        row.receivedQuantity = newReceivedQuantity;
        await itemRepo.save(row);

        receiveLines.push({
          itemId: row.id,
          productId: row.productId,
          quantityReceived: incomingQuantity,
        });
      }

      const itemsAfter = await itemRepo.find({
        where: { purchaseOrderId: id },
        order: { createdAt: 'ASC' },
      });
      const allFullyReceived = itemsAfter.every(
        (row) => Number(row.receivedQuantity) >= Number(row.orderedQuantity),
      );
      const anyPartiallyReceived = itemsAfter.some(
        (row) =>
          Number(row.receivedQuantity) > 0 &&
          Number(row.receivedQuantity) < Number(row.orderedQuantity),
      );

      if (allFullyReceived) {
        orderRow.status = PurchaseOrderStatus.RECEIVED;
      } else if (anyPartiallyReceived) {
        orderRow.status = PurchaseOrderStatus.PARTIALLY_RECEIVED;
      }

      orderRow.actualDeliveryDate = receiveDto.receivingDate
        ? new Date(receiveDto.receivingDate)
        : new Date();
      orderRow.updatedBy = performedBy;
      await poRepo.save(orderRow);

      for (const line of receiveLines) {
        await this.inventoryStockService.addStock(
          organizationId,
          orderRow.warehouseId,
          line.productId,
          line.quantityReceived,
          'purchase_order',
          orderRow.id,
          performedBy,
          `Received from PO ${orderRow.poNumber}`,
          manager,
        );
      }
    });

    return this.purchaseOrderRepository.findById(id, organizationId);
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

    if (
      po.status === PurchaseOrderStatus.RECEIVED ||
      po.status === PurchaseOrderStatus.PARTIALLY_RECEIVED
    ) {
      throw new BadRequestException(
        `Cannot cancel a purchase order in status ${po.status}. Stock has already been received.`,
      );
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

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { PaymentStatus, PurchaseOrderStatus } from '@tejas96/shared/types';
import { DataSource } from 'typeorm';

import { ProductRepository } from '../../master-data/repositories';
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
import { derivePaymentStatus } from './helpers/payment-status';
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
    private readonly inventoryStockService: InventoryStockService,
    private readonly projectRepository: ProjectRepository,
    private readonly productRepository: ProductRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new purchase order
   */
  async create(createDto: CreatePurchaseOrderDto, createdBy: string): Promise<PurchaseOrderEntity> {
    // Verify organization exists

    // Verify vendor exists
    await this.vendorRepository.findById(createDto.vendorId);

    // Verify warehouse exists if provided
    if (createDto.warehouseId) {
      await this.warehouseRepository.findById(createDto.warehouseId);
    }

    if (createDto.projectId) {
      await this.projectRepository.findById(createDto.projectId);
    }

    for (const item of createDto.items) {
      const product = await this.productRepository.findById(item.productId);
      if (!product) {
        throw new NotFoundException(`Product with ID ${item.productId} not found`);
      }
    }

    // Totals are server-derived from line items so client-supplied
    // subtotal/taxAmount/totalAmount cannot tamper with stored values.
    // The DTO still accepts them for backwards compatibility but they
    // are intentionally ignored here.
    let subtotal = 0;
    let taxAmount = 0;
    const lineItems = createDto.items.map((item) => {
      const taxRate = item.taxRate ?? 0;
      const itemSubtotal = item.unitPrice * item.orderedQuantity;
      const itemTax = itemSubtotal * (taxRate / 100);
      subtotal += itemSubtotal;
      taxAmount += itemTax;
      const lineTotal = itemSubtotal + itemTax;
      return { item, taxRate, lineTotal };
    });
    const totalAmount = subtotal + taxAmount;

    if (!Number.isFinite(subtotal) || !Number.isFinite(totalAmount)) {
      throw new BadRequestException(
        'Computed PO totals exceed the supported numeric range. Please reduce quantity or unit price.',
      );
    }

    const po = await this.runOrTranslateNumericError(() =>
      this.dataSource.transaction(async (manager) => {
        const poNumberTx = await this.purchaseOrderRepository.generatePoNumber(manager);
        const poRepo = manager.getRepository(PurchaseOrderEntity);
        const saved = await poRepo.save(
          poRepo.create({
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
            unitPriceSource: item.unitPriceSource ?? null,
          }),
        );
        await itemRepo.save(rows);
        return saved;
      }),
    );

    return this.purchaseOrderRepository.findById(po.id);
  }

  /**
   * Translate Postgres numeric overflow / out-of-range errors into a
   * user-friendly 400 instead of a generic 500.
   */
  private async runOrTranslateNumericError<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      const message = (err as { message?: string })?.message ?? '';
      const isNumericOverflow =
        code === '22003' ||
        code === '22P02' ||
        /numeric field overflow|out of range|value overflows/i.test(message);
      if (isNumericOverflow) {
        throw new BadRequestException(
          'One or more values exceed the maximum allowed range. Please reduce quantity or unit price.',
        );
      }
      throw err;
    }
  }

  /**
   * Find all purchase orders with filters
   */
  async findAll(
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
    return this.purchaseOrderRepository.findAll(page, limit, filters);
  }

  /**
   * Find purchase order by ID
   */
  async findById(id: string): Promise<PurchaseOrderEntity> {
    return this.purchaseOrderRepository.findById(id);
  }

  /**
   * Update purchase order
   */
  async update(
    id: string,
    updateDto: UpdatePurchaseOrderDto,
    updatedBy: string,
  ): Promise<PurchaseOrderEntity> {
    const po = await this.purchaseOrderRepository.findById(id);

    // Only allow updates if PO is in draft or pending approval status
    if (
      po.status !== PurchaseOrderStatus.DRAFT &&
      po.status !== PurchaseOrderStatus.PENDING_APPROVAL
    ) {
      throw new BadRequestException(`Cannot update purchase order with status ${po.status}`);
    }

    return this.purchaseOrderRepository.update(id, {
      ...updateDto,
      updatedBy,
    });
  }

  /**
   * Delete purchase order
   */
  async delete(id: string, deletedBy: string): Promise<void> {
    const po = await this.purchaseOrderRepository.findById(id);

    // Only allow deletion if PO is in draft status
    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Only draft purchase orders can be deleted');
    }

    await this.purchaseOrderItemRepository.deleteByPurchaseOrder(id);
    await this.purchaseOrderRepository.softDelete(id, deletedBy);
  }

  /**
   * Submit purchase order for approval
   */
  async submitForApproval(id: string, updatedBy: string): Promise<PurchaseOrderEntity> {
    const po = await this.purchaseOrderRepository.findById(id);

    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Only draft purchase orders can be submitted');
    }

    return this.purchaseOrderRepository.update(id, {
      status: PurchaseOrderStatus.PENDING_APPROVAL,
      updatedBy,
    });
  }

  /**
   * Approve purchase order
   */
  async approve(id: string, updatedBy: string): Promise<PurchaseOrderEntity> {
    const po = await this.purchaseOrderRepository.findById(id);

    if (po.status !== PurchaseOrderStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Only pending purchase orders can be approved');
    }

    return this.purchaseOrderRepository.update(id, {
      status: PurchaseOrderStatus.APPROVED,
      updatedBy,
    });
  }

  /**
   * Send purchase order to vendor
   */
  async send(id: string, updatedBy: string): Promise<PurchaseOrderEntity> {
    const po = await this.purchaseOrderRepository.findById(id);

    if (po.status !== PurchaseOrderStatus.APPROVED) {
      throw new BadRequestException('Only approved purchase orders can be sent');
    }

    return this.purchaseOrderRepository.update(id, {
      status: PurchaseOrderStatus.SENT,
      updatedBy,
    });
  }

  /**
   * Receive purchase order (full or partial)
   */
  async receive(
    id: string,
    receiveDto: ReceivePurchaseOrderDto,
    performedBy: string,
  ): Promise<PurchaseOrderEntity> {
    await this.dataSource.transaction(async (manager) => {
      const poRepo = manager.getRepository(PurchaseOrderEntity);
      const itemRepo = manager.getRepository(PurchaseOrderItemEntity);

      const orderRow = await poRepo
        .createQueryBuilder('po')
        .where('po.id = :id', { id })
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

    return this.purchaseOrderRepository.findById(id);
  }

  /**
   * Cancel purchase order
   */
  async cancel(id: string, reason: string, updatedBy: string): Promise<PurchaseOrderEntity> {
    const po = await this.purchaseOrderRepository.findById(id);

    if (
      po.status === PurchaseOrderStatus.RECEIVED ||
      po.status === PurchaseOrderStatus.PARTIALLY_RECEIVED
    ) {
      throw new BadRequestException(
        `Cannot cancel a purchase order in status ${po.status}. Stock has already been received.`,
      );
    }

    return this.purchaseOrderRepository.update(id, {
      status: PurchaseOrderStatus.CANCELLED,
      notes: `${po.notes ?? ''}\nCancelled: ${reason}`,
      updatedBy,
    });
  }

  /**
   * Record a payment against a PO. Updates paid_amount under a pessimistic
   * lock and re-derives payment_status from cumulative paid_amount.
   * Disallowed for DRAFT (not yet approved) and CANCELLED POs.
   */
  async recordPayment(
    id: string,
    amount: number,
    performedBy: string,
    notes?: string,
  ): Promise<PurchaseOrderEntity> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PurchaseOrderEntity);
      const po = await repo
        .createQueryBuilder('po')
        .where('po.id = :id', { id })
        .andWhere('po.deletedAt IS NULL')
        .setLock('pessimistic_write')
        .getOne();

      if (!po) {
        throw new NotFoundException(`Purchase Order with ID ${id} not found`);
      }
      if (po.status === PurchaseOrderStatus.DRAFT) {
        throw new BadRequestException('Cannot record payment on a draft purchase order');
      }
      if (po.status === PurchaseOrderStatus.CANCELLED) {
        throw new BadRequestException('Cannot record payment on a cancelled purchase order');
      }
      if (po.paymentStatus === PaymentStatus.PAID) {
        throw new BadRequestException('Purchase order is already fully paid');
      }

      const total = Number(po.totalAmount);
      const currentPaid = Number(po.paidAmount);
      const nextPaid = Number((currentPaid + amount).toFixed(2));

      if (nextPaid > total) {
        const remaining = Number((total - currentPaid).toFixed(2));
        throw new BadRequestException(
          `Payment exceeds outstanding balance. Remaining: ${remaining}`,
        );
      }

      po.paidAmount = nextPaid;
      po.paymentStatus = derivePaymentStatus(nextPaid, total);
      const noteLine = `[PAYMENT ${amount}] ${notes ?? ''}`.trim();
      po.notes = po.notes ? `${po.notes}\n${noteLine}` : noteLine;
      po.updatedBy = performedBy;
      await repo.save(po);
      return po;
    });
  }

  /**
   * Get purchase order statistics
   */
  async getStatistics() {
    const [countByStatus, pendingApprovals, overduePos] = await Promise.all([
      this.purchaseOrderRepository.countByStatus(),
      this.purchaseOrderRepository.getPendingApprovalsCount(),
      this.purchaseOrderRepository.getOverduePurchaseOrders(),
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
  async getOverduePurchaseOrders(): Promise<PurchaseOrderEntity[]> {
    return this.purchaseOrderRepository.getOverduePurchaseOrders();
  }
}

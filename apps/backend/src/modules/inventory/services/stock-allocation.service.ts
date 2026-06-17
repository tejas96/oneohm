import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { InventoryTransactionType, StockAllocationStatus } from '@tejas96/shared/types';
import { DataSource, EntityManager } from 'typeorm';

import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { ProjectRepository } from '../../projects/repositories/project.repository';
import {
  CreateStockAllocationDto,
  EditAllocationDetailsDto,
  FulfillStockAllocationDto,
} from '../dto';
import { InventoryStockEntity } from '../entities/inventory-stock.entity';
import { InventoryTransactionEntity } from '../entities/inventory-transaction.entity';
import { StockAllocationEntity } from '../entities/stock-allocation.entity';
import { StockAllocationRepository, WarehouseRepository } from '../repositories';

/**
 * Stock Allocation Service
 * Business logic for allocating inventory to projects.
 * All quantity-mutating methods are atomic (DataSource.transaction).
 */
@Injectable()
export class StockAllocationService {
  constructor(
    private readonly stockAllocationRepository: StockAllocationRepository,
    private readonly warehouseRepository: WarehouseRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly organizationRepository: OrganizationRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new stock allocation — reserves stock atomically.
   */
  async create(
    organizationId: string,
    createDto: CreateStockAllocationDto,
    createdBy: string,
  ): Promise<StockAllocationEntity> {
    await Promise.all([
      this.organizationRepository.findOneById(organizationId),
      this.projectRepository.findById(createDto.projectId, organizationId),
      this.warehouseRepository.findById(createDto.warehouseId, organizationId),
    ]);

    const allocationId = await this.dataSource.transaction(async (manager) => {
      // Lock and reserve stock atomically
      const stockRepo = manager.getRepository(
        (await import('../entities/inventory-stock.entity')).InventoryStockEntity,
      );
      const stock = await stockRepo
        .createQueryBuilder('stock')
        .where('stock.warehouseId = :wid', { wid: createDto.warehouseId })
        .andWhere('stock.productId = :pid', { pid: createDto.productId })
        .setLock('pessimistic_write')
        .getOne();

      if (!stock) {
        throw new BadRequestException(
          'No stock record found for this product/warehouse combination',
        );
      }
      if (Number(stock.availableQuantity) < createDto.allocatedQuantity) {
        throw new BadRequestException(
          `Insufficient stock: available ${stock.availableQuantity}, requested ${createDto.allocatedQuantity}`,
        );
      }

      stock.availableQuantity = Number(stock.availableQuantity) - createDto.allocatedQuantity;
      stock.reservedQuantity = Number(stock.reservedQuantity) + createDto.allocatedQuantity;
      stock.updatedAt = new Date();
      await stockRepo.save(stock);

      // Persist allocation record
      const allocationRepo = manager.getRepository(StockAllocationEntity);
      const allocation = allocationRepo.create({
        organizationId,
        projectId: createDto.projectId,
        warehouseId: createDto.warehouseId,
        productId: createDto.productId,
        allocatedQuantity: createDto.allocatedQuantity,
        dispatchedQuantity: 0,
        returnedQuantity: 0,
        sourceType: createDto.sourceType,
        status: StockAllocationStatus.ALLOCATED,
        notes: createDto.notes,
        createdBy,
      });
      await allocationRepo.save(allocation);

      // Write allocation transaction
      const { InventoryTransactionEntity } = await import(
        '../entities/inventory-transaction.entity'
      );
      const { InventoryTransactionType } = await import('@tejas96/shared/types');
      const txnRepo = manager.getRepository(InventoryTransactionEntity);
      await txnRepo.save(
        txnRepo.create({
          organizationId,
          warehouseId: createDto.warehouseId,
          productId: createDto.productId,
          transactionType: InventoryTransactionType.ALLOCATION,
          quantity: createDto.allocatedQuantity,
          transactionDate: new Date(),
          referenceType: 'stock_allocation',
          referenceId: allocation.id,
          notes: 'Stock reserved for project allocation',
          createdBy,
        }),
      );

      return allocation.id;
    });

    return this.stockAllocationRepository.findById(allocationId, organizationId);
  }

  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters?: {
      status?: StockAllocationStatus;
      activeOnly?: boolean;
      projectId?: string;
      warehouseId?: string;
      productId?: string;
    },
  ): Promise<{ allocations: StockAllocationEntity[]; total: number }> {
    return this.stockAllocationRepository.findAll(organizationId, page, limit, filters);
  }

  async findById(id: string, organizationId: string): Promise<StockAllocationEntity> {
    return this.stockAllocationRepository.findById(id, organizationId);
  }

  async findByProject(projectId: string, organizationId: string): Promise<StockAllocationEntity[]> {
    return this.stockAllocationRepository.findByProject(projectId, organizationId);
  }

  /**
   * Edit allocation metadata — only notes and expectedDispatchDate.
   * Quantity changes must go through domain methods.
   */
  async update(
    id: string,
    organizationId: string,
    editDto: EditAllocationDetailsDto,
    updatedBy: string,
  ): Promise<StockAllocationEntity> {
    const allocation = await this.stockAllocationRepository.findById(id, organizationId);

    if (allocation.status === StockAllocationStatus.DISPATCHED) {
      throw new BadRequestException('Cannot edit a fully dispatched allocation');
    }
    if (allocation.status === StockAllocationStatus.CANCELLED) {
      throw new BadRequestException('Cannot edit a cancelled allocation');
    }

    const updateData: Record<string, unknown> = { updatedBy };
    if (editDto.notes !== undefined) updateData.notes = editDto.notes;
    if (editDto.expectedDispatchDate !== undefined) {
      updateData.expectedDispatchDate = new Date(editDto.expectedDispatchDate);
    }

    return this.stockAllocationRepository.update(id, organizationId, updateData);
  }

  /**
   * Fulfill allocation — deducts from RESERVED (not available), correct bucket.
   */
  async fulfill(
    id: string,
    organizationId: string,
    fulfillDto: FulfillStockAllocationDto,
    performedBy: string,
  ): Promise<StockAllocationEntity> {
    const updatedAllocationId = await this.dataSource.transaction(async (manager) => {
      const allocationRepo = manager.getRepository(StockAllocationEntity);
      const allocationRow = await allocationRepo
        .createQueryBuilder('allocation')
        .where('allocation.id = :id', { id })
        .andWhere('allocation.organizationId = :organizationId', { organizationId })
        .setLock('pessimistic_write')
        .getOne();

      if (!allocationRow) {
        throw new NotFoundException(`Stock Allocation with ID ${id} not found`);
      }
      if (allocationRow.status === StockAllocationStatus.CANCELLED) {
        throw new BadRequestException('Cannot fulfill cancelled allocation');
      }

      const newDispatchedQuantity =
        Number(allocationRow.dispatchedQuantity) + fulfillDto.fulfilledQuantity;

      // Net quantity that must be at site after this dispatch
      // = newDispatched - alreadyReturned. This must not exceed the allocated budget.
      const netDispatched = newDispatchedQuantity - Number(allocationRow.returnedQuantity);
      if (netDispatched > Number(allocationRow.allocatedQuantity)) {
        throw new BadRequestException(
          'Net dispatched quantity (dispatched minus returned) cannot exceed allocated quantity',
        );
      }

      const newStatus =
        netDispatched >= Number(allocationRow.allocatedQuantity)
          ? StockAllocationStatus.DISPATCHED
          : StockAllocationStatus.PARTIALLY_DISPATCHED;

      const stock = await this.lockInventoryStock(
        manager,
        organizationId,
        allocationRow.warehouseId,
        allocationRow.productId,
      );
      if (!stock) {
        throw new BadRequestException(
          'No stock record found for this product/warehouse combination',
        );
      }

      // If re-dispatching previously returned items, those items are in `available`
      // (not `reserved`) because returnToStock moved them back to available.
      // Deduct from reserved first; any shortfall comes from available.
      const fromReserved = Math.min(fulfillDto.fulfilledQuantity, Number(stock.reservedQuantity));
      const fromAvailable = fulfillDto.fulfilledQuantity - fromReserved;

      if (fromAvailable > Number(stock.availableQuantity)) {
        throw new BadRequestException(
          'Insufficient stock (reserved + available) to fulfill this dispatch',
        );
      }

      stock.reservedQuantity = Number(stock.reservedQuantity) - fromReserved;
      stock.availableQuantity = Number(stock.availableQuantity) - fromAvailable;
      stock.updatedAt = new Date();
      await manager.getRepository(InventoryStockEntity).save(stock);

      const txnRepo = manager.getRepository(InventoryTransactionEntity);
      await txnRepo.save(
        txnRepo.create({
          organizationId,
          warehouseId: allocationRow.warehouseId,
          productId: allocationRow.productId,
          transactionType: InventoryTransactionType.DISPATCH,
          quantity: fulfillDto.fulfilledQuantity,
          transactionDate: new Date(),
          referenceType: 'stock_allocation',
          referenceId: allocationRow.id,
          notes: 'Fulfilled allocation for project',
          createdBy: performedBy,
        }),
      );

      Object.assign(allocationRow, {
        dispatchedQuantity: newDispatchedQuantity,
        status: newStatus,
        updatedBy: performedBy,
      });
      await allocationRepo.save(allocationRow);

      return allocationRow.id;
    });

    return this.stockAllocationRepository.findById(updatedAllocationId, organizationId);
  }

  /**
   * Cancel allocation — releases reserved stock back to available.
   */
  async cancel(
    id: string,
    organizationId: string,
    reason: string,
    updatedBy: string,
  ): Promise<StockAllocationEntity> {
    const updatedAllocationId = await this.dataSource.transaction(async (manager) => {
      // Pessimistic-lock the allocation row first so concurrent cancels serialize
      // and the second one observes status=CANCELLED instead of racing to a
      // double release of the reserved stock.
      const allocationRepo = manager.getRepository(StockAllocationEntity);
      const allocation = await allocationRepo
        .createQueryBuilder('alloc')
        .where('alloc.id = :id', { id })
        .andWhere('alloc.organizationId = :organizationId', { organizationId })
        .setLock('pessimistic_write')
        .getOne();
      if (!allocation) {
        throw new NotFoundException(`Stock Allocation with ID ${id} not found`);
      }
      if (allocation.status === StockAllocationStatus.DISPATCHED) {
        throw new BadRequestException('Cannot cancel a fully dispatched allocation');
      }
      if (allocation.status === StockAllocationStatus.CANCELLED) {
        throw new BadRequestException('Allocation is already cancelled');
      }

      const undispatchedQuantity =
        Number(allocation.allocatedQuantity) - Number(allocation.dispatchedQuantity);
      const newNotes = allocation.notes
        ? `${allocation.notes}\nCancelled: ${reason}`
        : `Cancelled: ${reason}`;

      if (undispatchedQuantity > 0) {
        const stock = await this.lockInventoryStock(
          manager,
          organizationId,
          allocation.warehouseId,
          allocation.productId,
        );
        if (!stock) {
          throw new BadRequestException('Stock record not found');
        }
        if (Number(stock.reservedQuantity) < undispatchedQuantity) {
          throw new BadRequestException('Insufficient reserved stock');
        }

        stock.availableQuantity = Number(stock.availableQuantity) + undispatchedQuantity;
        stock.reservedQuantity = Number(stock.reservedQuantity) - undispatchedQuantity;
        stock.updatedAt = new Date();
        await manager.getRepository(InventoryStockEntity).save(stock);

        const txnRepo = manager.getRepository(InventoryTransactionEntity);
        await txnRepo.save(
          txnRepo.create({
            organizationId,
            warehouseId: allocation.warehouseId,
            productId: allocation.productId,
            transactionType: InventoryTransactionType.ALLOCATION,
            quantity: undispatchedQuantity,
            transactionDate: new Date(),
            referenceType: 'stock_allocation',
            referenceId: allocation.id,
            notes: 'Reserved stock released from allocation',
            createdBy: updatedBy,
          }),
        );
      }

      Object.assign(allocation, {
        status: StockAllocationStatus.CANCELLED,
        notes: newNotes,
        updatedBy,
      });
      await allocationRepo.save(allocation);

      return allocation.id;
    });

    return this.stockAllocationRepository.findById(updatedAllocationId, organizationId);
  }

  /**
   * Return material to stock — increments returnedQuantity + adds back to available.
   *
   * Everything runs inside a single pessimistic-locked transaction so concurrent
   * return requests cannot race past the maxReturnQty guard and over-return.
   *
   * Status transitions:
   *  DISPATCHED / COMPLETED → PARTIALLY_DISPATCHED  (items no longer fully at site)
   *  Any other non-cancelled status stays unchanged.
   */
  async returnToStock(
    id: string,
    organizationId: string,
    quantity: number,
    reason: string,
    performedBy: string,
  ): Promise<StockAllocationEntity> {
    const updatedAllocationId = await this.dataSource.transaction(async (manager) => {
      // Pessimistic-lock the allocation row first — serialises concurrent returns.
      const allocationRepo = manager.getRepository(StockAllocationEntity);
      const allocationRow = await allocationRepo
        .createQueryBuilder('allocation')
        .where('allocation.id = :id', { id })
        .andWhere('allocation.organizationId = :organizationId', { organizationId })
        .setLock('pessimistic_write')
        .getOne();

      if (!allocationRow) {
        throw new NotFoundException(`Stock Allocation with ID ${id} not found`);
      }
      if (allocationRow.status === StockAllocationStatus.CANCELLED) {
        throw new BadRequestException('Cannot return stock from a cancelled allocation');
      }

      // Max returnable = total ever dispatched minus total already returned.
      const maxReturnQty =
        Number(allocationRow.dispatchedQuantity) - Number(allocationRow.returnedQuantity);
      if (maxReturnQty <= 0) {
        throw new BadRequestException('No dispatched stock available to return');
      }
      if (quantity > maxReturnQty) {
        throw new BadRequestException(
          `Return quantity ${quantity} exceeds returnable quantity ${maxReturnQty}`,
        );
      }

      const newReturnedQuantity = Number(allocationRow.returnedQuantity) + quantity;

      // If the allocation was fully dispatched or completed, revert to PARTIALLY_DISPATCHED
      // so the allocation is no longer considered complete (items are back in the warehouse).
      const terminalForwardStatuses = [
        StockAllocationStatus.DISPATCHED,
        StockAllocationStatus.COMPLETED,
      ];
      const newStatus = terminalForwardStatuses.includes(allocationRow.status)
        ? StockAllocationStatus.PARTIALLY_DISPATCHED
        : allocationRow.status;

      const stockRepo = manager.getRepository(InventoryStockEntity);
      const stock = await this.lockInventoryStock(
        manager,
        organizationId,
        allocationRow.warehouseId,
        allocationRow.productId,
      );

      if (!stock) {
        // Edge case: stock row was deleted after allocation — recreate it.
        const newStock = stockRepo.create({
          organizationId,
          warehouseId: allocationRow.warehouseId,
          productId: allocationRow.productId,
          availableQuantity: quantity,
          reservedQuantity: 0,
          inTransitQuantity: 0,
        });
        await stockRepo.save(newStock);
      } else {
        stock.availableQuantity = Number(stock.availableQuantity) + quantity;
        stock.updatedAt = new Date();
        await stockRepo.save(stock);
      }

      const txnRepo = manager.getRepository(InventoryTransactionEntity);
      await txnRepo.save(
        txnRepo.create({
          organizationId,
          warehouseId: allocationRow.warehouseId,
          productId: allocationRow.productId,
          transactionType: InventoryTransactionType.RETURN,
          quantity,
          transactionDate: new Date(),
          referenceType: 'stock_allocation_return',
          referenceId: allocationRow.id,
          notes: `[REASON: ${reason}] Return from project allocation`,
          createdBy: performedBy,
        }),
      );

      Object.assign(allocationRow, {
        returnedQuantity: newReturnedQuantity,
        returnedAt: new Date(),
        status: newStatus,
        updatedBy: performedBy,
      });
      await allocationRepo.save(allocationRow);

      return allocationRow.id;
    });

    return this.stockAllocationRepository.findById(updatedAllocationId, organizationId);
  }

  async getStatistics(organizationId: string) {
    const countByStatus = await this.stockAllocationRepository.countByStatus(organizationId);
    return {
      total: Object.values(countByStatus).reduce((sum: number, count) => sum + count, 0),
      byStatus: countByStatus,
    };
  }

  async getPendingAllocations(organizationId: string): Promise<StockAllocationEntity[]> {
    return this.stockAllocationRepository.getPendingAllocations(organizationId);
  }

  private async lockInventoryStock(
    manager: EntityManager,
    organizationId: string,
    warehouseId: string,
    productId: string,
  ): Promise<InventoryStockEntity | null> {
    return manager
      .getRepository(InventoryStockEntity)
      .createQueryBuilder('stock')
      .where('stock.warehouseId = :warehouseId', { warehouseId })
      .andWhere('stock.productId = :productId', { productId })
      .andWhere('stock.organizationId = :organizationId', { organizationId })
      .setLock('pessimistic_write')
      .getOne();
  }
}

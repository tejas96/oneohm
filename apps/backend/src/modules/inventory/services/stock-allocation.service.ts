import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { InventoryTransactionType, StockAllocationStatus } from '@oneohm-epc/shared/types';
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
      const { InventoryTransactionType } = await import('@oneohm-epc/shared/types');
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
      if (newDispatchedQuantity > Number(allocationRow.allocatedQuantity)) {
        throw new BadRequestException('Dispatched quantity cannot exceed allocated quantity');
      }

      const newStatus =
        newDispatchedQuantity >= Number(allocationRow.allocatedQuantity)
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
      if (Number(stock.reservedQuantity) < fulfillDto.fulfilledQuantity) {
        throw new BadRequestException('Insufficient reserved stock for dispatch');
      }

      stock.reservedQuantity = Number(stock.reservedQuantity) - fulfillDto.fulfilledQuantity;
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
    const allocation = await this.stockAllocationRepository.findById(id, organizationId);

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

    const updatedAllocationId = await this.dataSource.transaction(async (manager) => {
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

      const allocationRepo = manager.getRepository(StockAllocationEntity);
      const allocationRow = await allocationRepo.findOne({ where: { id, organizationId } });
      if (!allocationRow) {
        throw new NotFoundException(`Stock Allocation with ID ${id} not found`);
      }
      Object.assign(allocationRow, {
        status: StockAllocationStatus.CANCELLED,
        notes: newNotes,
        updatedBy,
      });
      await allocationRepo.save(allocationRow);

      return allocationRow.id;
    });

    return this.stockAllocationRepository.findById(updatedAllocationId, organizationId);
  }

  /**
   * Return material to stock — increments returnedQuantity + adds back to available.
   */
  async returnToStock(
    id: string,
    organizationId: string,
    quantity: number,
    reason: string,
    performedBy: string,
  ): Promise<StockAllocationEntity> {
    const allocation = await this.stockAllocationRepository.findById(id, organizationId);

    const maxReturnQty =
      Number(allocation.dispatchedQuantity) - Number(allocation.returnedQuantity);
    if (quantity > maxReturnQty) {
      throw new BadRequestException(
        `Return quantity ${quantity} exceeds returnable quantity ${maxReturnQty}`,
      );
    }

    const newReturnedQuantity = Number(allocation.returnedQuantity) + quantity;

    const updatedAllocationId = await this.dataSource.transaction(async (manager) => {
      const stockRepo = manager.getRepository(InventoryStockEntity);
      let stock = await this.lockInventoryStock(
        manager,
        organizationId,
        allocation.warehouseId,
        allocation.productId,
      );

      if (!stock) {
        stock = stockRepo.create({
          organizationId,
          warehouseId: allocation.warehouseId,
          productId: allocation.productId,
          availableQuantity: quantity,
          reservedQuantity: 0,
          inTransitQuantity: 0,
        });
        stock = await stockRepo.save(stock);
      } else {
        stock.availableQuantity = Number(stock.availableQuantity) + quantity;
        stock.updatedAt = new Date();
        stock = await stockRepo.save(stock);
      }

      const txnRepo = manager.getRepository(InventoryTransactionEntity);
      await txnRepo.save(
        txnRepo.create({
          organizationId,
          warehouseId: allocation.warehouseId,
          productId: allocation.productId,
          transactionType: InventoryTransactionType.RETURN,
          quantity,
          transactionDate: new Date(),
          referenceType: 'stock_allocation_return',
          referenceId: allocation.id,
          notes: `[REASON: ${reason}] Return from project allocation`,
          createdBy: performedBy,
        }),
      );

      const allocationRepo = manager.getRepository(StockAllocationEntity);
      const allocationRow = await allocationRepo.findOne({ where: { id, organizationId } });
      if (!allocationRow) {
        throw new NotFoundException(`Stock Allocation with ID ${id} not found`);
      }
      Object.assign(allocationRow, {
        returnedQuantity: newReturnedQuantity,
        returnedAt: new Date(),
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

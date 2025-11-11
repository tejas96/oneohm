import { BadRequestException, Injectable } from '@nestjs/common';
import { StockAllocationStatus } from '@oneohm-epc/shared-types';

import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { ProjectRepository } from '../../projects/repositories/project.repository';
import {
  CreateStockAllocationDto,
  FulfillStockAllocationDto,
  UpdateStockAllocationDto,
} from '../dto';
import { StockAllocationEntity } from '../entities/stock-allocation.entity';
import { StockAllocationRepository, WarehouseRepository } from '../repositories';
import { InventoryStockService } from './inventory-stock.service';

/**
 * Stock Allocation Service
 * Business logic for allocating inventory to projects
 */
@Injectable()
export class StockAllocationService {
  constructor(
    private readonly stockAllocationRepository: StockAllocationRepository,
    private readonly warehouseRepository: WarehouseRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly inventoryStockService: InventoryStockService,
  ) {}

  /**
   * Create a new stock allocation
   */
  async create(
    organizationId: string,
    createDto: CreateStockAllocationDto,
    createdBy: string,
  ): Promise<StockAllocationEntity> {
    // Verify dependencies
    await Promise.all([
      this.organizationRepository.findOneById(organizationId),
      this.projectRepository.findById(createDto.projectId, organizationId),
      this.warehouseRepository.findById(createDto.warehouseId, organizationId),
    ]);

    // Reserve stock
    await this.inventoryStockService.reserveStock(
      createDto.warehouseId,
      createDto.productId,
      createDto.allocatedQuantity,
    );

    // Create allocation
    const allocation = await this.stockAllocationRepository.create({
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

    return this.stockAllocationRepository.findById(allocation.id, organizationId);
  }

  /**
   * Find all allocations with filters
   */
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
  ) {
    return this.stockAllocationRepository.findAll(organizationId, page, limit, filters);
  }

  /**
   * Find allocation by ID
   */
  async findById(id: string, organizationId: string): Promise<StockAllocationEntity> {
    return this.stockAllocationRepository.findById(id, organizationId);
  }

  /**
   * Find allocations by project
   */
  async findByProject(projectId: string): Promise<StockAllocationEntity[]> {
    return this.stockAllocationRepository.findByProject(projectId);
  }

  /**
   * Update allocation
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateStockAllocationDto,
    updatedBy: string,
  ): Promise<StockAllocationEntity> {
    const allocation = await this.stockAllocationRepository.findById(id, organizationId);

    // Only allow updates if allocation is not fulfilled
    if (allocation.status === StockAllocationStatus.DISPATCHED) {
      throw new BadRequestException('Cannot update fulfilled allocation');
    }

    return this.stockAllocationRepository.update(id, organizationId, {
      ...updateDto,
      updatedBy,
    });
  }

  /**
   * Fulfill allocation (full or partial)
   */
  async fulfill(
    id: string,
    organizationId: string,
    fulfillDto: FulfillStockAllocationDto,
    performedBy: string,
  ): Promise<StockAllocationEntity> {
    const allocation = await this.stockAllocationRepository.findById(id, organizationId);

    if (allocation.status === StockAllocationStatus.CANCELLED) {
      throw new BadRequestException('Cannot fulfill cancelled allocation');
    }

    const newDispatchedQuantity = allocation.dispatchedQuantity + fulfillDto.fulfilledQuantity;

    if (newDispatchedQuantity > allocation.allocatedQuantity) {
      throw new BadRequestException('Dispatched quantity cannot exceed allocated quantity');
    }

    // Update allocation
    const newStatus =
      newDispatchedQuantity >= allocation.allocatedQuantity
        ? StockAllocationStatus.DISPATCHED
        : StockAllocationStatus.PARTIALLY_DISPATCHED;

    // Release allocated stock and remove from total
    await this.inventoryStockService.removeStock(
      organizationId,
      allocation.warehouseId,
      allocation.productId,
      fulfillDto.fulfilledQuantity,
      'stock_allocation',
      allocation.id,
      performedBy,
      `Fulfilled allocation for project`,
    );

    return this.stockAllocationRepository.update(id, organizationId, {
      dispatchedQuantity: newDispatchedQuantity,
      status: newStatus,
      updatedBy: performedBy,
    });
  }

  /**
   * Cancel allocation
   */
  async cancel(
    id: string,
    organizationId: string,
    reason: string,
    updatedBy: string,
  ): Promise<StockAllocationEntity> {
    const allocation = await this.stockAllocationRepository.findById(id, organizationId);

    if (allocation.status === StockAllocationStatus.DISPATCHED) {
      throw new BadRequestException('Cannot cancel fulfilled allocation');
    }

    // Release reserved stock
    const undispatchedQuantity = allocation.allocatedQuantity - allocation.dispatchedQuantity;

    if (undispatchedQuantity > 0) {
      await this.inventoryStockService.releaseStock(
        allocation.warehouseId,
        allocation.productId,
        undispatchedQuantity,
      );
    }

    return this.stockAllocationRepository.update(id, organizationId, {
      status: StockAllocationStatus.CANCELLED,
      notes: `${allocation.notes || ''}\nCancelled: ${reason}`,
      updatedBy,
    });
  }

  /**
   * Get allocation statistics
   */
  async getStatistics(organizationId: string) {
    const countByStatus = await this.stockAllocationRepository.countByStatus(organizationId);

    return {
      total: Object.values(countByStatus).reduce((sum, count) => sum + count, 0),
      byStatus: countByStatus,
    };
  }

  /**
   * Get pending allocations
   */
  async getPendingAllocations(organizationId: string): Promise<StockAllocationEntity[]> {
    return this.stockAllocationRepository.getPendingAllocations(organizationId);
  }
}


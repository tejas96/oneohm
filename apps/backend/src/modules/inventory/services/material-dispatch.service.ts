import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { MaterialDispatchStatus, StockAllocationStatus } from '@tejas96/shared/types';
import { DataSource } from 'typeorm';

import { ProductRepository } from '../../master-data/repositories/product.repository';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { ProjectRepository } from '../../projects/repositories/project.repository';
import {
  CreateMaterialDispatchDto,
  UpdateMaterialDispatchDto,
  UpdateMaterialDispatchStatusDto,
} from '../dto';
import { MaterialDispatchEntity } from '../entities/material-dispatch.entity';
import {
  MaterialDispatchItemRepository,
  MaterialDispatchRepository,
  StockAllocationRepository,
  WarehouseRepository,
} from '../repositories';
import { validateDispatchStatusTransition } from './helpers/dispatch-status-machine';
import { InventoryStockService } from './inventory-stock.service';

/**
 * Material Dispatch Service
 * Business logic for dispatching materials to project sites
 */
@Injectable()
export class MaterialDispatchService {
  constructor(
    private readonly materialDispatchRepository: MaterialDispatchRepository,
    private readonly materialDispatchItemRepository: MaterialDispatchItemRepository,
    private readonly stockAllocationRepository: StockAllocationRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly warehouseRepository: WarehouseRepository,
    private readonly productRepository: ProductRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly inventoryStockService: InventoryStockService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new material dispatch
   */
  async create(
    organizationId: string,
    createDto: CreateMaterialDispatchDto,
    createdBy: string,
  ): Promise<MaterialDispatchEntity> {
    // Verify dependencies
    await Promise.all([
      this.organizationRepository.findOneById(organizationId),
      this.projectRepository.findById(createDto.projectId, organizationId),
      this.warehouseRepository.findById(createDto.warehouseId, organizationId),
    ]);

    const uniqueProductIds = [...new Set(createDto.items.map((item) => item.productId))];
    const productLookups = await Promise.all(
      uniqueProductIds.map((productId) =>
        this.productRepository.findById(productId, organizationId, { requireActive: true }),
      ),
    );
    const invalidProductIds = uniqueProductIds.filter((_, index) => !productLookups[index]);
    if (invalidProductIds.length > 0) {
      throw new BadRequestException(
        `Invalid or inactive product IDs in dispatch items: ${invalidProductIds.join(', ')}`,
      );
    }

    const seenAllocationIds = new Set<string>();
    for (const item of createDto.items) {
      if (!item.stockAllocationId) {
        throw new BadRequestException(
          'Each dispatch line must include stockAllocationId so inventory and allocations stay in sync.',
        );
      }
      if (seenAllocationIds.has(item.stockAllocationId)) {
        throw new BadRequestException(
          `Duplicate stockAllocationId ${item.stockAllocationId} in dispatch items. Combine quantities into a single line per allocation.`,
        );
      }
      seenAllocationIds.add(item.stockAllocationId);
    }

    const uniqueAllocationIds = [...seenAllocationIds];

    const linkedAllocations = await Promise.all(
      uniqueAllocationIds.map((allocationId) =>
        this.stockAllocationRepository.findById(allocationId, organizationId),
      ),
    );
    const allocationById = new Map(
      linkedAllocations.map((allocation) => [allocation.id, allocation]),
    );

    for (const item of createDto.items) {
      const linkedAllocation = allocationById.get(item.stockAllocationId);
      if (!linkedAllocation) {
        throw new BadRequestException(`Invalid stock allocation ID: ${item.stockAllocationId}`);
      }
      if (linkedAllocation.status === StockAllocationStatus.CANCELLED) {
        throw new BadRequestException(
          `Stock allocation ${item.stockAllocationId} is cancelled and cannot be dispatched`,
        );
      }
      if (linkedAllocation.projectId !== createDto.projectId) {
        throw new BadRequestException(
          `Stock allocation ${item.stockAllocationId} does not belong to the selected project`,
        );
      }
      if (linkedAllocation.warehouseId !== createDto.warehouseId) {
        throw new BadRequestException(
          `Stock allocation ${item.stockAllocationId} does not belong to the selected warehouse`,
        );
      }
      if (linkedAllocation.productId !== item.productId) {
        throw new BadRequestException(
          `Stock allocation ${item.stockAllocationId} does not match product ${item.productId}`,
        );
      }
      const remaining =
        Number(linkedAllocation.allocatedQuantity) - Number(linkedAllocation.dispatchedQuantity);
      if (Number(item.quantity) > remaining) {
        throw new BadRequestException(
          `Dispatch quantity ${item.quantity} exceeds remaining allocation (${remaining}) on stock allocation ${item.stockAllocationId}.`,
        );
      }
    }

    // Fail fast if warehouse reserved stock cannot satisfy mark-dispatched (deducts reserved only).
    const reservedNeededByProduct = new Map<string, number>();
    for (const item of createDto.items) {
      const q = Number(item.quantity);
      reservedNeededByProduct.set(
        item.productId,
        (reservedNeededByProduct.get(item.productId) ?? 0) + q,
      );
    }
    for (const [productId, requiredReserved] of reservedNeededByProduct) {
      const stock = await this.inventoryStockService.getStock(
        organizationId,
        createDto.warehouseId,
        productId,
      );
      const reserved = stock ? Number(stock.reservedQuantity) : 0;
      if (reserved < requiredReserved) {
        throw new BadRequestException(
          `Cannot create dispatch: reserved stock in this warehouse for product ${productId} is ${reserved}, but line items require ${requiredReserved}. Ensure stock is reserved (allocated) for this warehouse before dispatching.`,
        );
      }
    }

    // Generate dispatch number
    const dispatchNumber =
      await this.materialDispatchRepository.generateDispatchNumber();

    // Create dispatch
    const dispatch = await this.materialDispatchRepository.create({
      organizationId,
      projectId: createDto.projectId,
      warehouseId: createDto.warehouseId,
      dispatchNumber,
      dispatchDate: createDto.dispatchDate ? new Date(createDto.dispatchDate) : new Date(),
      expectedDeliveryDate: createDto.expectedDeliveryDate
        ? new Date(createDto.expectedDeliveryDate)
        : undefined,
      vehicleNumber: createDto.vehicleNumber,
      driverName: createDto.driverName,
      driverPhone: createDto.driverPhone,
      transportCompany: createDto.transportCompany,
      status: MaterialDispatchStatus.PREPARED,
      notes: createDto.notes,
      createdBy,
    });

    // Create dispatch items
    if (createDto.items && createDto.items.length > 0) {
      const items = createDto.items.map((item) => ({
        dispatchId: dispatch.id,
        productId: item.productId,
        stockAllocationId: item.stockAllocationId,
        quantity: item.quantity,
        batchNumber: item.batchNumber,
        serialNumbers: item.serialNumbers,
        notes: item.notes,
      }));

      await this.materialDispatchItemRepository.createMany(items);
    }

    return this.materialDispatchRepository.findById(dispatch.id, organizationId);
  }

  /**
   * Find all dispatches with filters
   */
  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters?: {
      status?: MaterialDispatchStatus;
      projectId?: string;
      warehouseId?: string;
      fromDate?: string;
      toDate?: string;
      search?: string;
    },
  ) {
    return this.materialDispatchRepository.findAll(organizationId, page, limit, filters);
  }

  /**
   * Find dispatch by ID
   */
  async findById(id: string, organizationId: string): Promise<MaterialDispatchEntity> {
    return this.materialDispatchRepository.findById(id, organizationId);
  }

  /**
   * Find dispatches by project
   */
  async findByProject(
    projectId: string,
    organizationId: string,
  ): Promise<MaterialDispatchEntity[]> {
    return this.materialDispatchRepository.findByProject(projectId, organizationId);
  }

  /**
   * Update dispatch
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateMaterialDispatchDto,
    updatedBy: string,
  ): Promise<MaterialDispatchEntity> {
    const dispatch = await this.materialDispatchRepository.findById(id, organizationId);

    // Only allow updates if dispatch is in prepared status
    if (dispatch.status !== MaterialDispatchStatus.PREPARED) {
      throw new BadRequestException(`Cannot update dispatch with status ${dispatch.status}`);
    }

    return this.materialDispatchRepository.update(id, organizationId, {
      ...updateDto,
      updatedBy,
    });
  }

  /**
   * Update dispatch status
   */
  async updateStatus(
    id: string,
    organizationId: string,
    statusDto: UpdateMaterialDispatchStatusDto,
    updatedBy: string,
  ): Promise<MaterialDispatchEntity> {
    const dispatch = await this.materialDispatchRepository.findById(id, organizationId);

    validateDispatchStatusTransition(dispatch.status, statusDto.status);

    const updateData: Record<string, unknown> = {
      status: statusDto.status,
      updatedBy,
    };

    // Set dates based on status
    if (statusDto.status === MaterialDispatchStatus.IN_TRANSIT) {
      updateData.dispatchDate = statusDto.dispatchDate
        ? new Date(statusDto.dispatchDate)
        : new Date();
    }

    if (statusDto.status === MaterialDispatchStatus.DELIVERED) {
      updateData.actualDeliveryDate = statusDto.actualDeliveryDate
        ? new Date(statusDto.actualDeliveryDate)
        : new Date();
      updateData.receivedBy = statusDto.receivedById;
    }

    if (statusDto.notes) {
      updateData.notes = `${dispatch.notes || ''}\n${statusDto.notes}`;
    }

    return this.materialDispatchRepository.update(id, organizationId, updateData);
  }

  /**
   * Mark dispatch as IN_TRANSIT — deducts reserved stock atomically.
   * Transitions PREPARED → IN_TRANSIT.
   */
  async markDispatched(
    id: string,
    organizationId: string,
    performedBy: string,
  ): Promise<MaterialDispatchEntity> {
    const dispatch = await this.materialDispatchRepository.findById(id, organizationId);

    if (dispatch.status !== MaterialDispatchStatus.PREPARED) {
      throw new BadRequestException(
        `Cannot mark dispatched — dispatch is in status ${dispatch.status}`,
      );
    }

    // Deduct reserved stock for each line item atomically
    await this.dataSource.transaction(async (manager) => {
      for (const item of dispatch.items ?? []) {
        await this.inventoryStockService.deductReservedStock(
          organizationId,
          dispatch.warehouseId,
          item.productId,
          Number(item.quantity),
          'material_dispatch',
          dispatch.id,
          performedBy,
          `Dispatched from ${dispatch.dispatchNumber}`,
          manager,
        );

        // Update allocation dispatched quantity if linked
        if (item.stockAllocationId) {
          const { StockAllocationEntity } = await import('../entities/stock-allocation.entity');
          const allocRepo = manager.getRepository(StockAllocationEntity);
          const alloc = await allocRepo
            .createQueryBuilder('alloc')
            .where('alloc.id = :id', { id: item.stockAllocationId })
            .setLock('pessimistic_write')
            .getOne();
          if (alloc) {
            const nextDispatchedQuantity = Number(alloc.dispatchedQuantity) + Number(item.quantity);
            alloc.dispatchedQuantity = nextDispatchedQuantity;
            if (nextDispatchedQuantity <= 0) {
              alloc.status = StockAllocationStatus.ALLOCATED;
            } else if (nextDispatchedQuantity < Number(alloc.allocatedQuantity)) {
              alloc.status = StockAllocationStatus.PARTIALLY_DISPATCHED;
            } else {
              alloc.status = StockAllocationStatus.DISPATCHED;
            }
            alloc.updatedBy = performedBy;
            await allocRepo.save(alloc);
          }
        }
      }
    });

    return this.materialDispatchRepository.update(id, organizationId, {
      status: MaterialDispatchStatus.IN_TRANSIT,
      updatedBy: performedBy,
    });
  }

  /**
   * Mark dispatch as DELIVERED. Transitions IN_TRANSIT → DELIVERED or
   * PARTIALLY_DELIVERED → DELIVERED. Sets actualDeliveryDate and finalises
   * linked allocations to COMPLETED when fully dispatched.
   */
  async markDelivered(
    id: string,
    organizationId: string,
    performedBy: string,
    actualDeliveryDate?: Date,
    receivedById?: string,
  ): Promise<MaterialDispatchEntity> {
    const dispatch = await this.materialDispatchRepository.findById(id, organizationId);

    const allowed =
      dispatch.status === MaterialDispatchStatus.IN_TRANSIT ||
      dispatch.status === MaterialDispatchStatus.PARTIALLY_DELIVERED;
    if (!allowed) {
      throw new BadRequestException(
        `Cannot mark delivered — dispatch is in status ${dispatch.status}`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const { StockAllocationEntity } = await import('../entities/stock-allocation.entity');
      const allocRepo = manager.getRepository(StockAllocationEntity);
      for (const item of dispatch.items ?? []) {
        if (!item.stockAllocationId) continue;
        const alloc = await allocRepo
          .createQueryBuilder('alloc')
          .where('alloc.id = :id', { id: item.stockAllocationId })
          .setLock('pessimistic_write')
          .getOne();
        if (
          alloc &&
          alloc.status === StockAllocationStatus.DISPATCHED &&
          Number(alloc.dispatchedQuantity) >= Number(alloc.allocatedQuantity)
        ) {
          alloc.status = StockAllocationStatus.COMPLETED;
          alloc.updatedBy = performedBy;
          await allocRepo.save(alloc);
        }
      }
    });

    return this.materialDispatchRepository.update(id, organizationId, {
      status: MaterialDispatchStatus.DELIVERED,
      actualDeliveryDate: actualDeliveryDate ?? new Date(),
      receivedBy: receivedById,
      updatedBy: performedBy,
    });
  }

  /**
   * Cancel dispatch
   */
  async cancel(
    id: string,
    organizationId: string,
    reason: string,
    updatedBy: string,
  ): Promise<MaterialDispatchEntity> {
    const dispatch = await this.materialDispatchRepository.findById(id, organizationId);

    if (dispatch.status === MaterialDispatchStatus.DELIVERED) {
      throw new BadRequestException('Cannot cancel a delivered dispatch');
    }

    const hasStockMovement =
      dispatch.status === MaterialDispatchStatus.DISPATCHED ||
      dispatch.status === MaterialDispatchStatus.IN_TRANSIT ||
      dispatch.status === MaterialDispatchStatus.PARTIALLY_DELIVERED;

    if (hasStockMovement) {
      await this.dataSource.transaction(async (manager) => {
        for (const item of dispatch.items ?? []) {
          const itemQuantity = Number(item.quantity);
          if (itemQuantity <= 0) continue;

          await this.inventoryStockService.restoreReservedStock(
            organizationId,
            dispatch.warehouseId,
            item.productId,
            itemQuantity,
            'material_dispatch_cancel',
            dispatch.id,
            updatedBy,
            `Dispatch ${dispatch.dispatchNumber} cancelled: restored reserved stock`,
            manager,
          );

          if (item.stockAllocationId) {
            const { StockAllocationEntity } = await import('../entities/stock-allocation.entity');
            const allocationRepo = manager.getRepository(StockAllocationEntity);
            const allocation = await allocationRepo.findOne({
              where: { id: item.stockAllocationId, organizationId },
            });

            if (allocation && allocation.status !== StockAllocationStatus.CANCELLED) {
              const updatedDispatchedQuantity = Math.max(
                0,
                Number(allocation.dispatchedQuantity) - itemQuantity,
              );
              allocation.dispatchedQuantity = updatedDispatchedQuantity;

              if (updatedDispatchedQuantity === 0) {
                allocation.status = StockAllocationStatus.ALLOCATED;
              } else if (updatedDispatchedQuantity < Number(allocation.allocatedQuantity)) {
                allocation.status = StockAllocationStatus.PARTIALLY_DISPATCHED;
              } else {
                allocation.status = StockAllocationStatus.DISPATCHED;
              }

              allocation.updatedBy = updatedBy;
              await allocationRepo.save(allocation);
            }
          }
        }
      });
    }

    return this.materialDispatchRepository.update(id, organizationId, {
      status: MaterialDispatchStatus.CANCELLED,
      notes: `${dispatch.notes || ''}\nCancelled: ${reason}`,
      updatedBy,
    });
  }

  /**
   * Delete dispatch
   */
  async delete(id: string, organizationId: string): Promise<void> {
    const dispatch = await this.materialDispatchRepository.findById(id, organizationId);

    // Only allow deletion if dispatch is in draft status
    if (dispatch.status !== MaterialDispatchStatus.PREPARED) {
      throw new BadRequestException('Only draft dispatches can be deleted');
    }

    await this.materialDispatchRepository.delete(id, organizationId);
  }

  /**
   * Get dispatch statistics
   */
  async getStatistics(organizationId: string) {
    const countByStatus = await this.materialDispatchRepository.countByStatus(organizationId);

    return {
      total: Object.values(countByStatus).reduce((sum, count) => sum + count, 0),
      byStatus: countByStatus,
    };
  }

  /**
   * Get in-transit dispatches
   */
  async getInTransitDispatches(organizationId: string): Promise<MaterialDispatchEntity[]> {
    return this.materialDispatchRepository.getInTransitDispatches(organizationId);
  }

  /**
   * Get pending dispatches
   */
  async getPendingDispatches(organizationId: string): Promise<MaterialDispatchEntity[]> {
    return this.materialDispatchRepository.getPendingDispatches(organizationId);
  }
}

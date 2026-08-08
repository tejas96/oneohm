import { randomUUID } from 'crypto';

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  BomAllocationStatus,
  SERIALIZED_BOM_ITEM_TYPES,
  StockAllocationSourceType,
  StockAllocationStatus,
} from '@tejas96/shared/types';
import { DataSource, EntityManager, In, IsNull, Not, QueryFailedError } from 'typeorm';

import { InventoryStockEntity } from '../../inventory/entities/inventory-stock.entity';
import { ReturnRequestEntity } from '../../inventory/entities/return-request.entity';
import { StockAllocationEntity } from '../../inventory/entities/stock-allocation.entity';
import { StockAllocationService } from '../../inventory/services/stock-allocation.service';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { CalculateQuoteResponseDto } from '../../quotes/dto/calculator/calculate-quote-response.dto';
import { BomItemEntity } from '../entities/bom-item.entity';
import { BomEntity } from '../entities/bom.entity';
import { BomRepository } from '../repositories/bom.repository';

// ============================================================
// LOCK ORDERING (deadlock prevention — must never be violated):
//   1. BOM row          (SELECT ... FOR UPDATE on bom)
//   2. StockAllocation  (SELECT ... FOR UPDATE on stock_allocations)
//   3. InventoryStock   (SELECT ... FOR UPDATE on inventory_stock)
//
// reconcileFromCalculation and allocatePending both start by locking the BOM row.
// cancel/fulfill in StockAllocationService lock allocation then inventory — no BOM lock, no inversion.
// Any NEW code that touches allocations must follow this order.
// ============================================================

const SERIALIZED_BOM_ITEM_TYPES_SET = new Set<string>(SERIALIZED_BOM_ITEM_TYPES);

@Injectable()
export class BomService {
  private readonly logger = new Logger(BomService.name);

  constructor(
    private readonly bomRepository: BomRepository,
    @Inject(forwardRef(() => StockAllocationService))
    private readonly stockAllocationService: StockAllocationService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async createFromCalculation(
    entityType: string,
    entityId: string,
    calculation: CalculateQuoteResponseDto,
    createdBy: string,
  ): Promise<BomEntity> {
    const items: Partial<BomItemEntity>[] = [];
    let sortOrder = 0;
    const panels = Array.isArray(calculation?.panels) ? calculation.panels : [];
    const inverterItems = Array.isArray(calculation?.inverters?.inverters)
      ? calculation.inverters.inverters
      : [];
    const structure = calculation?.structure;

    // Map panels
    for (const panel of panels) {
      sortOrder = this.appendBomLineItems(
        items,
        {
          itemType: 'panel',
          productId: this.toSafeUuid(panel.productId),
          name: panel.name || 'Solar Panel',
          brand: panel.brand,
          specifications: {
            isDcr: panel.isDcr,
            technology: panel.technology,
            wattagePerPanel: panel.wattagePerPanel,
            pricePerWatt: panel.pricePerWatt,
            performanceWarrantyYears: panel.performanceWarrantyYears,
          },
          quantity: Number(panel.quantity ?? 1),
          unit: 'nos',
          totalPrice: panel.lineTotal,
          gstRate: panel.gstRate,
          gstAmount: panel.gstAmount,
          warrantyYears: panel.productWarrantyYears,
        },
        sortOrder,
      );
    }

    // Map inverters
    for (const inv of inverterItems) {
      sortOrder = this.appendBomLineItems(
        items,
        {
          itemType: 'inverter',
          productId: this.toSafeUuid(inv.productId),
          name: inv.name || 'Inverter',
          brand: inv.brand,
          specifications: { capacityKw: inv.capacityKw },
          quantity: Number(inv.quantity ?? 1),
          unit: 'nos',
          totalPrice: inv.lineTotal,
          gstRate: inv.gstRate,
          gstAmount: inv.gstAmount,
          warrantyYears: inv.productWarrantyYears,
        },
        sortOrder,
      );
    }

    // Map structure
    if (structure && typeof structure === 'object') {
      this.appendBomLineItems(
        items,
        {
          itemType: 'structure',
          productId: this.toSafeUuid(structure.productId),
          name: structure.name || 'Structure',
          specifications: { structureType: structure.structureType },
          quantity: Number(structure.quantity ?? 1),
          unit: 'set',
          totalPrice: structure.lineTotal,
          gstRate: structure.gstRate,
          gstAmount: structure.gstAmount,
        },
        sortOrder,
      );
    }

    if (items.length === 0) {
      throw new BadRequestException(
        'Cannot create BOM from quote snapshot: no valid panel, inverter, or structure items found.',
      );
    }

    // Count distinct line items (not total quantity)
    const totalItems = items.length;
    const totalCost = items.reduce((sum, i) => sum + (i.totalPrice ?? 0), 0);

    return this.bomRepository.create({
      // bomNumber is generated inside BomRepository.create() within a transaction
      entityType,
      entityId,
      status: 'finalized',
      totalItems,
      totalCost,
      items: items as BomItemEntity[],
      createdBy,
    });
  }

  async createFromItems(
    entityType: string,
    entityId: string,
    sourceItems: Array<Partial<BomItemEntity>>,
    createdBy: string,
  ): Promise<BomEntity> {
    const items = sourceItems.map((item, index) => ({
      ...item,
      quantity: Math.max(1, Math.trunc(item.quantity ?? 1)),
      sortOrder: item.sortOrder ?? index,
    })) as BomItemEntity[];

    const totalItems = items.length;
    const totalCost = items.reduce((sum, item) => sum + Number(item.totalPrice ?? 0), 0);

    return this.bomRepository.create({
      entityType,
      entityId,
      status: 'finalized',
      totalItems,
      totalCost,
      items,
      createdBy,
    });
  }

  async findByEntity(
    entityType: string,
    entityId: string,
  ): Promise<
    | (BomEntity & { productAllocationStatus: Record<string, 'allocated' | 'partial' | 'pending'> })
    | null
  > {
    const bom = await this.bomRepository.findByEntity(entityType, entityId);
    if (!bom) return null;

    // Build per-product allocation status from live BOM-linked allocations
    const productAllocationStatus: Record<string, 'allocated' | 'partial' | 'pending'> = {};

    if (bom.entityType === 'project' && bom.items?.length) {
      const allocRepo = this.dataSource.getRepository(StockAllocationEntity);

      // Compute required qty per product from BOM items
      const required = new Map<string, number>();
      for (const item of bom.items) {
        if (!item.productId) continue;
        required.set(item.productId, (required.get(item.productId) ?? 0) + item.quantity);
      }

      if (required.size > 0) {
        const activeAllocs = await allocRepo.find({
          where: { bomId: bom.id, status: Not(StockAllocationStatus.CANCELLED) },
          select: ['productId', 'allocatedQuantity'],
        });

        const reserved = new Map<string, number>();
        for (const a of activeAllocs) {
          reserved.set(a.productId, (reserved.get(a.productId) ?? 0) + Number(a.allocatedQuantity));
        }

        let fullyAllocatedCount = 0;
        let partialCount = 0;

        for (const [productId, requiredQty] of required) {
          const reservedQty = reserved.get(productId) ?? 0;
          if (reservedQty >= requiredQty) {
            productAllocationStatus[productId] = 'allocated';
            fullyAllocatedCount++;
          } else if (reservedQty > 0) {
            productAllocationStatus[productId] = 'partial';
            partialCount++;
          } else {
            productAllocationStatus[productId] = 'pending';
          }
        }

        // Recompute BOM-level allocationStatus from live data — overrides the stale DB column
        if (fullyAllocatedCount === required.size) {
          bom.allocationStatus = BomAllocationStatus.FULLY_ALLOCATED;
        } else if (fullyAllocatedCount > 0 || partialCount > 0) {
          bom.allocationStatus = BomAllocationStatus.PARTIAL;
        } else {
          bom.allocationStatus = BomAllocationStatus.PENDING;
        }
      }
    }

    return Object.assign(bom, { productAllocationStatus });
  }

  async deleteByEntity(
    entityType: string,
    entityId: string,
  ): Promise<void> {
    // Belt-and-suspenders guard on top of the FK ON DELETE RESTRICT constraint.
    // Project BOMs may have linked stock_allocations; deleting without cancelling
    // them first would orphan reserved inventory. Quote-version BOMs never have
    // allocations so this check is a safe no-op for them.
    if (entityType === 'project') {
      const bom = await this.bomRepository.findByEntity(entityType, entityId);
      if (bom) {
        const { StockAllocationEntity } = await import(
          '../../inventory/entities/stock-allocation.entity'
        );
        const allocationRepo = this.dataSource.getRepository(StockAllocationEntity);
        const activeCount = await allocationRepo.count({
          where: {
            bomId: bom.id,
          } as import('typeorm').FindOptionsWhere<
            import('../../inventory/entities/stock-allocation.entity').StockAllocationEntity
          >,
        });
        if (activeCount > 0) {
          throw new ConflictException(
            'Cannot delete BOM with active stock allocations. Cancel allocations first.',
          );
        }
      }
    }
    return this.bomRepository.deleteByEntity(entityType, entityId);
  }

  // ============================================================
  // PHASE 2 + 3 — Reconciliation engine & partial allocation
  // ============================================================

  /**
   * Non-destructive BOM reconciliation.
   *
   * Diffs the existing BOM against a new calculation snapshot and applies only
   * the minimum set of changes needed:
   *   - Added products    → insert items, auto-allocate if warehouse is set
   *   - Removed products  → cancel allocation, delete items
   *   - Qty increased     → top-up allocation
   *   - Qty decreased     → release undispatched reservation; if newRequired < dispatched,
   *                         create a return_request for the excess
   *
   * All work runs inside a single transaction.  The BOM row is locked first
   * (pessimistic_write) to serialise concurrent reconcile/allocate calls.
   *
   * If no BOM exists yet for the project, the BOM is created first from the
   * calculation (matching the existing createFromCalculation path), then no
   * diff needs to be applied.
   */
  async reconcileFromCalculation(
    projectId: string,
    calculation: CalculateQuoteResponseDto,
    userId: string,
  ): Promise<{
    added: string[];
    removed: string[];
    increased: string[];
    decreased: string[];
    pendingStock: string[];
    overDispatched: string[];
  }> {
    // Resolve project's default warehouse (lightweight query — no heavy joins)
    const projectRow = await this.dataSource
      .getRepository(ProjectEntity)
      .findOne({ where: { id: projectId }, select: ['id', 'defaultWarehouseId'] });
    const warehouseId = projectRow?.defaultWarehouseId ?? null;

    // Build the incoming product map from the calculation snapshot
    const incomingMap = this.buildIncomingProductMap(calculation);

    return this.dataSource.transaction(async (manager) => {
      // --- Lock BOM row first (lock-order rule: BOM → allocation → inventory) ---
      const bomRepo = manager.getRepository(BomEntity);
      const existingBom = await bomRepo
        .createQueryBuilder('bom')
        .where('bom.entityType = :et', { et: 'project' })
        .andWhere('bom.entityId = :eid', { eid: projectId })
        .setLock('pessimistic_write')
        .getOne();

      // No BOM yet → create from calculation (no diff needed)
      if (!existingBom) {
        await this.bomRepository.create({
          entityType: 'project',
          entityId: projectId,
          status: 'finalized',
          allocationStatus: BomAllocationStatus.PENDING,
          totalItems: 0,
          totalCost: 0,
          items: [] as BomItemEntity[],
          createdBy: userId,
        });
        // Reload and build items via standard path
        const freshBom = await bomRepo.findOne({
          where: { entityType: 'project', entityId: projectId },
          relations: ['items'],
        });
        if (freshBom) {
          await this.applyAddedProducts(
            manager,
            freshBom,
            incomingMap,
            warehouseId,
            userId,
          );
          await this.recomputeBomTotals(manager, freshBom);
        }
        return {
          added: [...incomingMap.keys()],
          removed: [],
          increased: [],
          decreased: [],
          pendingStock: [],
          overDispatched: [],
        };
      }

      // Load items
      const itemRepo = manager.getRepository(BomItemEntity);
      const existingItems = await itemRepo.find({ where: { bomId: existingBom.id } });

      // Group existing items by productId
      const existingProductMap = new Map<
        string,
        { items: BomItemEntity[]; totalQty: number; name: string }
      >();
      for (const item of existingItems) {
        if (!item.productId) continue;
        const entry = existingProductMap.get(item.productId);
        if (entry) {
          entry.items.push(item);
          entry.totalQty += item.quantity;
        } else {
          existingProductMap.set(item.productId, {
            items: [item],
            totalQty: item.quantity,
            name: item.name,
          });
        }
      }

      // Load active allocations for this BOM
      const allocRepo = manager.getRepository(StockAllocationEntity);
      const activeAllocations = await allocRepo.find({
        where: {
          bomId: existingBom.id,
          status: Not(StockAllocationStatus.CANCELLED),
        },
      });
      const allocationByProduct = new Map<string, StockAllocationEntity>();
      for (const alloc of activeAllocations) {
        allocationByProduct.set(alloc.productId, alloc);
      }

      const added: string[] = [];
      const removed: string[] = [];
      const increased: string[] = [];
      const decreased: string[] = [];
      const pendingStock: string[] = [];
      const overDispatched: string[] = [];

      // --- Removed products ---
      for (const [productId, existingEntry] of existingProductMap) {
        if (!incomingMap.has(productId)) {
          // Cancel allocation if exists
          const alloc = allocationByProduct.get(productId);
          if (alloc) {
            await this.stockAllocationService.cancel(
              alloc.id,
              'BOM line removed (reconcile)',
              userId,
            );
          }
          // Delete all item rows for this product
          await itemRepo.delete({ bomId: existingBom.id, productId });
          removed.push(existingEntry.name);
        }
      }

      // --- Added products ---
      const addedEntries = [...incomingMap.entries()].filter(
        ([pid]) => !existingProductMap.has(pid),
      );
      if (addedEntries.length > 0) {
        for (const [, incoming] of addedEntries) {
          const newItems: Partial<BomItemEntity>[] = [];
          let sortOrder = existingItems.length;
          sortOrder = this.appendBomLineItems(newItems, incoming, sortOrder);
          const savedItems = await itemRepo.save(
            newItems.map((i) => itemRepo.create({ ...i, bomId: existingBom.id })),
          );
          added.push(incoming.name);

          if (warehouseId) {
            const totalQty = savedItems.reduce((s, i) => s + i.quantity, 0);
            const result = await this.allocateForProduct(
              manager,
              existingBom,
              incoming.productId!,
              warehouseId,
              totalQty,
              userId,
            );
            if (result.shortfall > 0) pendingStock.push(incoming.name);
          } else {
            pendingStock.push(incoming.name);
          }
        }
      }

      // --- Changed products (quantity increase or decrease) ---
      for (const [productId, incoming] of incomingMap) {
        const existingEntry = existingProductMap.get(productId);
        if (!existingEntry) continue; // Already handled as "added" above

        const newRequired = incoming.quantity;
        const oldTotal = existingEntry.totalQty;

        if (newRequired === oldTotal) continue; // Unchanged

        const alloc = allocationByProduct.get(productId);
        const dispatched = alloc ? Number(alloc.dispatchedQuantity) : 0;
        const allocated = alloc ? Number(alloc.allocatedQuantity) : 0;

        if (newRequired > oldTotal) {
          // QTY INCREASED
          const delta = newRequired - oldTotal;
          increased.push(incoming.name);

          // Insert extra unit rows (serialized item types share groupKey)
          await this.insertExtraUnits(
            manager,
            existingBom.id,
            existingEntry.items,
            incoming,
            delta,
          );

          if (warehouseId) {
            const result = await this.allocateForProduct(
              manager,
              existingBom,
              productId,
              warehouseId,
              newRequired,
              userId,
            );
            if (result.shortfall > 0) pendingStock.push(incoming.name);
          } else {
            pendingStock.push(incoming.name);
          }
        } else {
          // QTY DECREASED
          decreased.push(incoming.name);
          const delta = oldTotal - newRequired;

          // Remove excess item rows (unassigned serial rows first)
          await this.removeExcessUnits(manager, existingBom.id, existingEntry.items, delta);

          if (alloc) {
            if (newRequired >= dispatched) {
              // Release undispatched portion from reservation
              const releaseQty = allocated - newRequired;
              if (releaseQty > 0) {
                await this.releaseReservation(manager, alloc, releaseQty, userId);
              }
            } else {
              // OVER-DISPATCH: required drops below what's already physically sent
              const undispatchedToRelease = allocated - dispatched;
              if (undispatchedToRelease > 0) {
                await this.releaseReservation(
                  manager,
                  alloc,
                  undispatchedToRelease,
                  userId,
                );
              }
              // Create return request for the surplus that was dispatched
              const returnQty = dispatched - newRequired;
              const returnRequestRepo = manager.getRepository(ReturnRequestEntity);
              await returnRequestRepo.save(
                returnRequestRepo.create({
                  allocationId: alloc.id,
                  bomId: existingBom.id,
                  quantity: returnQty,
                  reason: `BOM reconcile: required quantity reduced to ${newRequired} but ${dispatched} already dispatched`,
                  status: 'pending',
                  createdBy: userId,
                }),
              );
              overDispatched.push(incoming.name);
              // Flag the BOM items for this product
              await itemRepo
                .createQueryBuilder()
                .update(BomItemEntity)
                .set({
                  specifications: () => `specifications || '{"overDispatched": true}'::jsonb`,
                })
                .where('bomId = :bomId', { bomId: existingBom.id })
                .andWhere('productId = :productId', { productId })
                .execute();
            }
          }
        }
      }

      // Recompute BOM totals and allocation status
      await this.recomputeBomTotals(manager, existingBom);
      await this.recomputeAllocationStatus(manager, existingBom);

      return { added, removed, increased, decreased, pendingStock, overDispatched };
    });
  }

  /**
   * Reserve stock for all pending BOM product lines.
   *
   * Reads the project's defaultWarehouseId (fails with 400 if not set).
   * Partial allocation is normal — items without sufficient stock are returned
   * in the `pendingStock` array.  Idempotent: already-satisfied lines are skipped.
   *
   * Lock order: BOM row → inventory_stock row (via allocateForProduct).
   */
  async allocatePending(
    bomId: string,
    userId: string,
  ): Promise<{
    allocated: Array<{ productId: string; name: string; reserved: number }>;
    pendingStock: Array<{ productId: string; name: string; shortfall: number }>;
    alreadySatisfied: Array<{ productId: string; name: string }>;
  }> {
    const bom = await this.bomRepository.findByEntityId(bomId);
    if (!bom) throw new NotFoundException(`BOM ${bomId} not found`);

    if (bom.entityType !== 'project') {
      throw new BadRequestException('Can only allocate BOMs associated with a project');
    }

    if (!bom.items?.length) {
      throw new BadRequestException('No BOM for this project. Create or sync materials first.');
    }

    // Resolve project's warehouse
    const projectRow = await this.dataSource
      .getRepository(ProjectEntity)
      .findOne({ where: { id: bom.entityId }, select: ['id', 'defaultWarehouseId'] });

    const warehouseId = projectRow?.defaultWarehouseId;
    if (!warehouseId) {
      throw new BadRequestException(
        'No default warehouse set for this project. Set it in the Project Overview before reserving stock.',
      );
    }

    const result = await this.dataSource.transaction(async (manager) => {
      // Lock BOM row first
      const bomRepo = manager.getRepository(BomEntity);
      const lockedBom = await bomRepo
        .createQueryBuilder('bom')
        .where('bom.id = :id', { id: bomId })
        .setLock('pessimistic_write')
        .getOne();
      if (!lockedBom) throw new NotFoundException(`BOM ${bomId} not found`);

      // Reload items within transaction
      const itemRepo = manager.getRepository(BomItemEntity);
      const items = await itemRepo.find({ where: { bomId } });

      // Group by productId
      const groupedItems = items.reduce<
        Map<string, { productId: string; name: string; totalQty: number }>
      >((acc, item) => {
        if (!item.productId) return acc;
        const existing = acc.get(item.productId);
        if (existing) {
          existing.totalQty += item.quantity;
        } else {
          acc.set(item.productId, {
            productId: item.productId,
            name: item.name,
            totalQty: item.quantity,
          });
        }
        return acc;
      }, new Map());

      const allocated: Array<{ productId: string; name: string; reserved: number }> = [];
      const pendingStock: Array<{ productId: string; name: string; shortfall: number }> = [];
      const alreadySatisfied: Array<{ productId: string; name: string }> = [];

      for (const { productId, name, totalQty } of groupedItems.values()) {
        const alloc = await this.allocateForProduct(
          manager,
          lockedBom,
          productId,
          warehouseId,
          totalQty,
          userId,
        );
        if (alloc.status === 'satisfied') {
          alreadySatisfied.push({ productId, name });
        } else if (alloc.reserved > 0 && alloc.shortfall === 0) {
          allocated.push({ productId, name, reserved: alloc.reserved });
        } else if (alloc.reserved > 0 && alloc.shortfall > 0) {
          allocated.push({ productId, name, reserved: alloc.reserved });
          pendingStock.push({ productId, name, shortfall: alloc.shortfall });
        } else {
          pendingStock.push({ productId, name, shortfall: totalQty });
        }
      }

      await this.recomputeAllocationStatus(manager, lockedBom);
      return { allocated, pendingStock, alreadySatisfied };
    });

    return result;
  }

  /**
   * Helper: reserve stock for one product line within an open transaction.
   *
   * Lock order: (caller holds BOM lock) → inventory_stock row.
   *
   * @returns { reserved, shortfall, status }
   *   status: 'satisfied' | 'partial' | 'new'
   */
  private async allocateForProduct(
    manager: EntityManager,
    bom: BomEntity,
    productId: string,
    warehouseId: string,
    requiredQty: number,
    userId: string,
  ): Promise<{ reserved: number; shortfall: number; status: 'satisfied' | 'partial' | 'new' }> {
    const allocRepo = manager.getRepository(StockAllocationEntity);

    // Find active (non-cancelled) BOM-linked allocation for this (bom, product)
    let existingAlloc = await allocRepo.findOne({
      where: {
        bomId: bom.id,
        productId,
        status: Not(StockAllocationStatus.CANCELLED),
      },
    });

    // Mismatched warehouse guard
    if (existingAlloc && existingAlloc.warehouseId !== warehouseId) {
      throw new ConflictException(
        `Allocation for product ${productId} already exists in a different warehouse. Release it first.`,
      );
    }

    // If no BOM-linked allocation exists yet, check for a manual project-scoped allocation
    // (bom_id IS NULL) for the same product+warehouse. If one exists, adopt it by stamping
    // bom_id onto it — this avoids double-reserving stock that is already physically reserved
    // and makes recomputeAllocationStatus correctly count it toward BOM coverage.
    if (!existingAlloc) {
      const manualAlloc = await allocRepo.findOne({
        where: {
          bomId: IsNull(),
          projectId: bom.entityId,
          productId,
          warehouseId,
          status: Not(StockAllocationStatus.CANCELLED),
        },
      });
      if (manualAlloc) {
        manualAlloc.bomId = bom.id;
        manualAlloc.notes = `${manualAlloc.notes ? `${manualAlloc.notes} | ` : ''}Linked to BOM ${bom.bomNumber} on reserve`;
        manualAlloc.updatedBy = userId;
        await allocRepo.save(manualAlloc);
        existingAlloc = manualAlloc;
      }
    }

    const alreadyAllocated = existingAlloc ? Number(existingAlloc.allocatedQuantity) : 0;

    if (alreadyAllocated >= requiredQty) {
      return { reserved: 0, shortfall: 0, status: 'satisfied' };
    }

    const topUpNeeded = requiredQty - alreadyAllocated;

    // Lock the inventory row
    const stockRepo = manager.getRepository(InventoryStockEntity);
    const stock = await stockRepo
      .createQueryBuilder('stock')
      .where('stock.warehouseId = :wid', { wid: warehouseId })
      .andWhere('stock.productId = :pid', { pid: productId })
      .setLock('pessimistic_write')
      .getOne();

    const available = stock ? Number(stock.availableQuantity) : 0;
    if (available <= 0) {
      return { reserved: 0, shortfall: topUpNeeded, status: 'new' };
    }

    const reserve = Math.min(available, topUpNeeded);
    const shortfall = topUpNeeded - reserve;

    // Update inventory stock
    if (stock) {
      stock.availableQuantity = Number(stock.availableQuantity) - reserve;
      stock.reservedQuantity = Number(stock.reservedQuantity) + reserve;
      stock.updatedAt = new Date();
      await stockRepo.save(stock);
    }

    const { InventoryTransactionEntity } = await import(
      '../../inventory/entities/inventory-transaction.entity'
    );
    const { InventoryTransactionType } = await import('@tejas96/shared/types');
    const txnRepo = manager.getRepository(InventoryTransactionEntity);

    if (existingAlloc) {
      // Top-up existing allocation
      existingAlloc.allocatedQuantity = alreadyAllocated + reserve;
      existingAlloc.updatedBy = userId;
      await allocRepo.save(existingAlloc);

      await txnRepo.save(
        txnRepo.create({
          warehouseId,
          productId,
          transactionType: InventoryTransactionType.ALLOCATION,
          quantity: reserve,
          transactionDate: new Date(),
          referenceType: 'stock_allocation',
          referenceId: existingAlloc.id,
          notes: `BOM top-up allocation (${bom.bomNumber})`,
          createdBy: userId,
        }),
      );
    } else {
      // Create new allocation
      const newAlloc = allocRepo.create({
        projectId: bom.entityId,
        warehouseId,
        productId,
        bomId: bom.id,
        allocatedQuantity: reserve,
        dispatchedQuantity: 0,
        returnedQuantity: 0,
        sourceType: StockAllocationSourceType.OWN,
        status: StockAllocationStatus.ALLOCATED,
        notes: `Auto-allocated from BOM ${bom.bomNumber}`,
        createdBy: userId,
      });
      await allocRepo.save(newAlloc);

      await txnRepo.save(
        txnRepo.create({
          warehouseId,
          productId,
          transactionType: InventoryTransactionType.ALLOCATION,
          quantity: reserve,
          transactionDate: new Date(),
          referenceType: 'stock_allocation',
          referenceId: newAlloc.id,
          notes: `Stock reserved for BOM ${bom.bomNumber}`,
          createdBy: userId,
        }),
      );
    }

    return { reserved: reserve, shortfall, status: 'new' };
  }

  /**
   * Release a portion of reserved inventory back to available.
   * Operates within an open transaction (lock-order: BOM already held by caller).
   */
  private async releaseReservation(
    manager: EntityManager,
    allocation: StockAllocationEntity,
    releaseQty: number,
    userId: string,
  ): Promise<void> {
    const stockRepo = manager.getRepository(InventoryStockEntity);
    const stock = await stockRepo
      .createQueryBuilder('stock')
      .where('stock.warehouseId = :wid', { wid: allocation.warehouseId })
      .andWhere('stock.productId = :pid', { pid: allocation.productId })
      .setLock('pessimistic_write')
      .getOne();

    if (stock) {
      stock.availableQuantity = Number(stock.availableQuantity) + releaseQty;
      stock.reservedQuantity = Math.max(0, Number(stock.reservedQuantity) - releaseQty);
      stock.updatedAt = new Date();
      await stockRepo.save(stock);
    }

    const allocRepo = manager.getRepository(StockAllocationEntity);
    allocation.allocatedQuantity = Number(allocation.allocatedQuantity) - releaseQty;
    allocation.updatedBy = userId;
    await allocRepo.save(allocation);

    const { InventoryTransactionEntity } = await import(
      '../../inventory/entities/inventory-transaction.entity'
    );
    const { InventoryTransactionType } = await import('@tejas96/shared/types');
    const txnRepo = manager.getRepository(InventoryTransactionEntity);
    await txnRepo.save(
      txnRepo.create({
        warehouseId: allocation.warehouseId,
        productId: allocation.productId,
        transactionType: InventoryTransactionType.ALLOCATION,
        quantity: releaseQty,
        transactionDate: new Date(),
        referenceType: 'stock_allocation',
        referenceId: allocation.id,
        notes: 'Released reserved stock (BOM reconcile)',
        createdBy: userId,
      }),
    );
  }

  /** Recompute BOM.allocationStatus from live allocations. */
  private async recomputeAllocationStatus(manager: EntityManager, bom: BomEntity): Promise<void> {
    const itemRepo = manager.getRepository(BomItemEntity);
    const allocRepo = manager.getRepository(StockAllocationEntity);

    const items = await itemRepo.find({ where: { bomId: bom.id } });
    const productGroups = new Map<string, number>();
    for (const item of items) {
      if (!item.productId) continue;
      productGroups.set(item.productId, (productGroups.get(item.productId) ?? 0) + item.quantity);
    }

    if (productGroups.size === 0) {
      await manager
        .getRepository(BomEntity)
        .update(bom.id, { allocationStatus: BomAllocationStatus.PENDING });
      return;
    }

    const activeAllocs = await allocRepo.find({
      where: { bomId: bom.id, status: Not(StockAllocationStatus.CANCELLED) },
      select: ['productId', 'allocatedQuantity'],
    });
    // Sum quantities per product — defensive against edge-case duplicate rows
    const allocByProduct = new Map<string, number>();
    for (const a of activeAllocs) {
      allocByProduct.set(
        a.productId,
        (allocByProduct.get(a.productId) ?? 0) + Number(a.allocatedQuantity),
      );
    }

    let fullyAllocated = 0;
    let partiallyAllocated = 0;

    for (const [productId, requiredQty] of productGroups) {
      const reserved = allocByProduct.get(productId) ?? 0;
      if (reserved >= requiredQty) {
        fullyAllocated++;
      } else if (reserved > 0) {
        partiallyAllocated++;
      }
    }

    let newStatus: BomAllocationStatus;
    if (fullyAllocated === productGroups.size) {
      newStatus = BomAllocationStatus.FULLY_ALLOCATED;
    } else if (fullyAllocated > 0 || partiallyAllocated > 0) {
      newStatus = BomAllocationStatus.PARTIAL;
    } else {
      newStatus = BomAllocationStatus.PENDING;
    }

    await manager.getRepository(BomEntity).update(bom.id, { allocationStatus: newStatus });
  }

  /** Recompute totalItems and totalCost from live items within a transaction. */
  private async recomputeBomTotals(manager: EntityManager, bom: BomEntity): Promise<void> {
    const itemRepo = manager.getRepository(BomItemEntity);
    const items = await itemRepo.find({ where: { bomId: bom.id } });
    const totalItems = items.length;
    const totalCost = items.reduce((s, i) => s + Number(i.totalPrice ?? 0), 0);
    await manager.getRepository(BomEntity).update(bom.id, { totalItems, totalCost });
  }

  /**
   * Insert extra unit rows when quantity increases for a serialized item type.
   * Reuses the existing groupKey so the frontend group-collapse continues to work.
   */
  private async insertExtraUnits(
    manager: EntityManager,
    bomId: string,
    existingRows: BomItemEntity[],
    incoming: ReturnType<BomService['buildIncomingProductMap']> extends Map<string, infer V>
      ? V
      : never,
    delta: number,
  ): Promise<void> {
    const itemRepo = manager.getRepository(BomItemEntity);
    const isSerialized = SERIALIZED_BOM_ITEM_TYPES_SET.has(incoming.itemType);

    if (!isSerialized) {
      // Non-serialized: just update quantity on the single row
      const row = existingRows[0];
      if (row) {
        row.quantity += delta;
        await itemRepo.save(row);
      }
      return;
    }

    // Find existing groupKey and max unitIndex
    const existingGroupKey = existingRows[0]?.groupKey ?? randomUUID();
    const maxUnitIndex = existingRows.reduce((max, r) => Math.max(max, r.unitIndex ?? 0), 0);
    const maxSortOrder = existingRows.reduce((max, r) => Math.max(max, r.sortOrder ?? 0), 0);

    const lineTotal = Number(incoming.totalPrice ?? 0);
    const splitTotals = this.splitMoneyEvenly(lineTotal, delta);

    const newRows: Partial<BomItemEntity>[] = [];
    for (let i = 0; i < delta; i++) {
      const unitTotal = splitTotals[i] ?? 0;
      newRows.push({
        bomId,
        itemType: incoming.itemType,
        productId: incoming.productId,
        name: incoming.name,
        brand: incoming.brand,
        specifications: incoming.specifications ?? {},
        quantity: 1,
        unit: incoming.unit ?? 'nos',
        unitPrice: unitTotal,
        totalPrice: unitTotal,
        gstRate: incoming.gstRate,
        gstAmount: 0,
        warrantyYears: incoming.warrantyYears,
        groupKey: existingGroupKey,
        unitIndex: maxUnitIndex + i + 1,
        sortOrder: maxSortOrder + i + 1,
      });
    }
    await itemRepo.save(newRows.map((r) => itemRepo.create(r)));
  }

  /**
   * Remove excess unit rows when quantity decreases.
   * Deletes unassigned-serial rows first (highest unitIndex first).
   * If forced to touch serialized rows, treats them as over-dispatched (kept in DB, flagged).
   */
  private async removeExcessUnits(
    manager: EntityManager,
    bomId: string,
    existingRows: BomItemEntity[],
    delta: number,
  ): Promise<void> {
    const itemRepo = manager.getRepository(BomItemEntity);
    const isSerialized = existingRows.some((r) => SERIALIZED_BOM_ITEM_TYPES_SET.has(r.itemType));

    if (!isSerialized) {
      const row = existingRows[0];
      if (row) {
        row.quantity = Math.max(0, row.quantity - delta);
        await itemRepo.save(row);
      }
      return;
    }

    // Sort: unassigned serials first (IS NULL), then by unitIndex DESC
    const sorted = [...existingRows].sort((a, b) => {
      const aHasSerial = a.serialNumber ? 1 : 0;
      const bHasSerial = b.serialNumber ? 1 : 0;
      if (aHasSerial !== bHasSerial) return aHasSerial - bHasSerial;
      return (b.unitIndex ?? 0) - (a.unitIndex ?? 0);
    });

    let toDelete = delta;
    const idsToDelete: string[] = [];

    for (const row of sorted) {
      if (toDelete <= 0) break;
      if (!row.serialNumber) {
        idsToDelete.push(row.id);
        toDelete--;
      }
      // Rows with serial numbers are left in place; the over-dispatch flow
      // in the caller creates the return_request for the surplus.
    }

    if (idsToDelete.length > 0) {
      await itemRepo.delete({ id: In(idsToDelete) });
    }
  }

  /** Build a flat product map from a calculation snapshot (reuses createFromCalculation logic). */
  private buildIncomingProductMap(calculation: CalculateQuoteResponseDto): Map<
    string,
    {
      itemType: string;
      productId?: string;
      name: string;
      brand?: string;
      specifications?: Record<string, unknown>;
      quantity: number;
      unit?: string;
      totalPrice?: number;
      gstRate?: number;
      gstAmount?: number;
      warrantyYears?: number;
    }
  > {
    const map = new Map<
      string,
      ReturnType<typeof this.buildIncomingProductMap> extends Map<string, infer V> ? V : never
    >();

    const panels = Array.isArray(calculation?.panels) ? calculation.panels : [];
    for (const panel of panels) {
      const pid = this.toSafeUuid(panel.productId);
      if (!pid) continue;
      map.set(pid, {
        itemType: 'panel',
        productId: pid,
        name: panel.name || 'Solar Panel',
        brand: panel.brand,
        specifications: {
          isDcr: panel.isDcr,
          technology: panel.technology,
          wattagePerPanel: panel.wattagePerPanel,
          pricePerWatt: panel.pricePerWatt,
          performanceWarrantyYears: panel.performanceWarrantyYears,
        },
        quantity: Math.max(1, Math.trunc(Number(panel.quantity ?? 1))),
        unit: 'nos',
        totalPrice: panel.lineTotal,
        gstRate: panel.gstRate,
        gstAmount: panel.gstAmount,
        warrantyYears: panel.productWarrantyYears,
      });
    }

    const inverterItems = Array.isArray(calculation?.inverters?.inverters)
      ? calculation.inverters.inverters
      : [];
    for (const inv of inverterItems) {
      const pid = this.toSafeUuid(inv.productId);
      if (!pid) continue;
      map.set(pid, {
        itemType: 'inverter',
        productId: pid,
        name: inv.name || 'Inverter',
        brand: inv.brand,
        specifications: { capacityKw: inv.capacityKw },
        quantity: Math.max(1, Math.trunc(Number(inv.quantity ?? 1))),
        unit: 'nos',
        totalPrice: inv.lineTotal,
        gstRate: inv.gstRate,
        gstAmount: inv.gstAmount,
        warrantyYears: inv.productWarrantyYears,
      });
    }

    const structure = calculation?.structure;
    if (structure && typeof structure === 'object') {
      const pid = this.toSafeUuid(structure.productId);
      if (pid) {
        map.set(pid, {
          itemType: 'structure',
          productId: pid,
          name: structure.name || 'Structure',
          specifications: { structureType: structure.structureType },
          quantity: Math.max(1, Math.trunc(Number(structure.quantity ?? 1))),
          unit: 'set',
          totalPrice: structure.lineTotal,
          gstRate: structure.gstRate,
          gstAmount: structure.gstAmount,
        });
      }
    }

    return map;
  }

  /** Apply added products during initial BOM creation via reconcile. */
  private async applyAddedProducts(
    manager: EntityManager,
    bom: BomEntity,
    incomingMap: ReturnType<BomService['buildIncomingProductMap']>,
    warehouseId: string | null,
    userId: string,
  ): Promise<void> {
    const itemRepo = manager.getRepository(BomItemEntity);
    let sortOrder = 0;

    for (const incoming of incomingMap.values()) {
      const newItems: Partial<BomItemEntity>[] = [];
      sortOrder = this.appendBomLineItems(newItems, incoming, sortOrder);
      await itemRepo.save(newItems.map((i) => itemRepo.create({ ...i, bomId: bom.id })));

      if (warehouseId && incoming.productId) {
        await this.allocateForProduct(
          manager,
          bom,
          incoming.productId,
          warehouseId,
          incoming.quantity,
          userId,
        );
      }
    }
  }

  async updateItemSerial(
    itemId: string,
    serialNumber: string | null,
  ): Promise<BomItemEntity> {
    const updatedId = await this.dataSource.transaction(async (manager) => {
      const item = await this.findBomItemForOrg(manager, itemId);
      const normalizedSerial = this.normalizeSerialNumber(serialNumber);

      this.ensureSerializableItemType(item.itemType);
      item.serialNumber = normalizedSerial ?? undefined;
      await this.saveItemWithUniqueGuard(manager, item);
      return item.id;
    });

    const itemRepo = this.dataSource.getRepository(BomItemEntity);
    const updated = await itemRepo.findOne({ where: { id: updatedId } });
    if (!updated) {
      throw new NotFoundException(`BOM item ${itemId} not found`);
    }
    return updated;
  }

  async bulkUpdateItemSerials(
    updates: Array<{ id: string; serialNumber: string | null }>,
  ): Promise<BomItemEntity[]> {
    const updatedItemIds = await this.dataSource.transaction(async (manager) => {
      const ids: string[] = [];
      for (const update of updates) {
        const item = await this.findBomItemForOrg(manager, update.id);
        this.ensureSerializableItemType(item.itemType);
        item.serialNumber = this.normalizeSerialNumber(update.serialNumber) ?? undefined;
        await this.saveItemWithUniqueGuard(manager, item);
        ids.push(item.id);
      }
      return ids;
    });

    if (updatedItemIds.length === 0) return [];
    return this.dataSource.getRepository(BomItemEntity).findBy({ id: In(updatedItemIds) });
  }

  async findSerialConflicts(
    serialNumber: string,
  ): Promise<
    Array<{
      bomId: string;
      bomNumber: string;
      entityType: string;
      entityId: string;
      itemId: string;
      itemType: string;
      itemName: string;
    }>
  > {
    const normalizedSerial = this.normalizeSerialNumber(serialNumber);
    if (!normalizedSerial) return [];

    const rows = await this.dataSource
      .getRepository(BomItemEntity)
      .createQueryBuilder('item')
      .innerJoin('item.bom', 'bom')
      .select([
        'item.id AS item_id',
        'item.itemType AS item_type',
        'item.name AS item_name',
        'bom.id AS bom_id',
        'bom.bomNumber AS bom_number',
        'bom.entityType AS entity_type',
        'bom.entityId AS entity_id',
      ])
      .andWhere('item.serialNumber = :serialNumber', { serialNumber: normalizedSerial })
      .orderBy('bom.createdAt', 'DESC')
      .getRawMany<{
        item_id: string;
        item_type: string;
        item_name: string;
        bom_id: string;
        bom_number: string;
        entity_type: string;
        entity_id: string;
      }>();

    return rows.map((row) => ({
      bomId: row.bom_id,
      bomNumber: row.bom_number,
      entityType: row.entity_type,
      entityId: row.entity_id,
      itemId: row.item_id,
      itemType: row.item_type,
      itemName: row.item_name,
    }));
  }

  private appendBomLineItems(
    targetItems: Partial<BomItemEntity>[],
    item: {
      itemType: string;
      productId?: string;
      name: string;
      brand?: string;
      specifications?: Record<string, unknown>;
      quantity: number;
      unit?: string;
      totalPrice?: number;
      gstRate?: number;
      gstAmount?: number;
      warrantyYears?: number;
    },
    sortOrder: number,
  ): number {
    const safeQuantity = Math.max(1, Math.trunc(item.quantity || 1));
    const lineTotal = Number(item.totalPrice ?? 0);
    const lineGst = Number(item.gstAmount ?? 0);
    const shouldExplode = SERIALIZED_BOM_ITEM_TYPES_SET.has(item.itemType) && safeQuantity > 1;

    if (!shouldExplode) {
      targetItems.push({
        itemType: item.itemType,
        productId: item.productId,
        name: item.name,
        brand: item.brand,
        specifications: item.specifications ?? {},
        quantity: safeQuantity,
        unit: item.unit ?? 'nos',
        unitPrice: safeQuantity > 0 ? Number((lineTotal / safeQuantity).toFixed(2)) : undefined,
        totalPrice: lineTotal,
        gstRate: item.gstRate,
        gstAmount: lineGst,
        warrantyYears: item.warrantyYears,
        sortOrder,
      });
      return sortOrder + 1;
    }

    const groupKey = randomUUID();
    const splitTotals = this.splitMoneyEvenly(lineTotal, safeQuantity);
    const splitGstAmounts = this.splitMoneyEvenly(lineGst, safeQuantity);

    for (let unitIndex = 1; unitIndex <= safeQuantity; unitIndex += 1) {
      const unitTotal = splitTotals[unitIndex - 1] ?? 0;
      targetItems.push({
        itemType: item.itemType,
        productId: item.productId,
        name: item.name,
        brand: item.brand,
        specifications: item.specifications ?? {},
        quantity: 1,
        unit: item.unit ?? 'nos',
        unitPrice: unitTotal,
        totalPrice: unitTotal,
        gstRate: item.gstRate,
        gstAmount: splitGstAmounts[unitIndex - 1] ?? 0,
        warrantyYears: item.warrantyYears,
        serialNumber: undefined,
        groupKey,
        unitIndex,
        sortOrder,
      });
      sortOrder += 1;
    }

    return sortOrder;
  }

  private splitMoneyEvenly(total: number, count: number): number[] {
    if (count <= 0) return [];
    const totalInPaise = Math.round(total * 100);
    const baseShare = Math.trunc(totalInPaise / count);
    let remainder = totalInPaise - baseShare * count;
    const result = Array.from({ length: count }, () => baseShare);

    for (let i = 0; i < result.length && remainder > 0; i += 1) {
      const current = result[i];
      if (current === undefined) break;
      result[i] = current + 1;
      remainder -= 1;
    }

    for (let i = 0; i < result.length && remainder < 0; i += 1) {
      const current = result[i];
      if (current === undefined) break;
      result[i] = current - 1;
      remainder += 1;
    }

    return result.map((value) => value / 100);
  }

  private toSafeUuid(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      trimmed,
    )
      ? trimmed
      : undefined;
  }

  private async findBomItemForOrg(
    manager: EntityManager,
    itemId: string,
  ): Promise<BomItemEntity> {
    const item = await manager
      .getRepository(BomItemEntity)
      .createQueryBuilder('item')
      .innerJoinAndSelect('item.bom', 'bom')
      .where('item.id = :itemId', { itemId })
      .getOne();

    if (!item) {
      throw new NotFoundException(`BOM item ${itemId} not found`);
    }
    return item;
  }

  private ensureSerializableItemType(itemType: string): void {
    if (!SERIALIZED_BOM_ITEM_TYPES_SET.has(itemType)) {
      throw new BadRequestException(`Serial numbers are not supported for ${itemType} items`);
    }
  }

  private normalizeSerialNumber(serialNumber: string | null): string | null {
    if (serialNumber === null) return null;
    const trimmed = serialNumber.trim();
    if (!trimmed) return null;
    if (trimmed.length > 100) {
      throw new BadRequestException('serialNumber must be at most 100 characters');
    }
    if (!/^[A-Za-z0-9_/-]+$/.test(trimmed)) {
      throw new BadRequestException(
        'serialNumber contains invalid characters (allowed: letters, numbers, -, _, /)',
      );
    }
    return trimmed;
  }

  private async saveItemWithUniqueGuard(
    manager: EntityManager,
    item: BomItemEntity,
  ): Promise<void> {
    try {
      await manager.getRepository(BomItemEntity).save(item);
    } catch (error) {
      if (error instanceof QueryFailedError && (error as { code?: string }).code === '23505') {
        throw new ConflictException(
          'Serial number already exists in this BOM. Please enter a unique serial number.',
        );
      }
      throw error;
    }
  }

  // ============================================================
  // PROCUREMENT (plan §2.5 / §3.4)
  // ============================================================

  /**
   * Sum BOM-target quantities per product for a project. Returns a map
   * keyed by productId — products absent from the BOM are absent from
   * the map (caller must treat that as 0).
   *
   * Multiple BOM rows for the same product (e.g. unitised serial rows)
   * are summed. Pulls only the requested productIds when supplied.
   */
  async getBomTargetsForProject(
    projectId: string,
    productIdsFilter?: string[],
  ): Promise<Map<string, number>> {
    const params: unknown[] = [projectId];
    let filterSql = '';
    if (productIdsFilter && productIdsFilter.length > 0) {
      params.push(productIdsFilter);
      filterSql = `AND bi.product_id = ANY($2::uuid[])`;
    }

    const rows = await this.dataSource.query(
      `SELECT bi.product_id AS product_id,
              COALESCE(SUM(bi.quantity), 0)::numeric AS target
         FROM bom b
         JOIN bom_items bi ON bi.bom_id = b.id
        WHERE b.entity_type = 'project'
          AND b.entity_id = $1::uuid
          AND bi.product_id IS NOT NULL
          ${filterSql}
        GROUP BY bi.product_id`,
      params,
    );

    const out = new Map<string, number>();
    for (const r of rows) out.set(r.product_id, Number(r.target));
    return out;
  }

  /**
   * Procurement status for a project (plan §3.4). Joins BOM items
   * (target qty + name + unit price for spend-budget) with the
   * already-spent qty pulled from `expense_product_links`. Status is
   * derived per row:
   *   procured  : spent >= target
   *   partial   : 0 < spent < target
   *   pending   : spent == 0
   * Rows where spent > target are flagged via the `over` boolean.
   */
  async getProcurementStatus(
    projectId: string,
  ): Promise<{
    items: Array<{
      productId: string;
      name: string;
      unit: string;
      targetQty: number;
      spentQty: number;
      status: 'pending' | 'partial' | 'procured';
      over: boolean;
      remaining: number;
      unitPrice: number | null;
      targetSpend: number | null;
      actualSpend: number;
    }>;
    totals: {
      totalProducts: number;
      pending: number;
      partial: number;
      procured: number;
      overProcuredProducts: number;
      targetSpend: number;
      actualSpend: number;
    };
  }> {
    const rows = await this.dataSource.query(
      `WITH bom_targets AS (
         SELECT bi.product_id,
                MIN(bi.name)        AS name,
                MIN(bi.unit)        AS unit,
                SUM(bi.quantity)    AS target_qty,
                MAX(bi.unit_price)  AS unit_price
           FROM bom b
           JOIN bom_items bi ON bi.bom_id = b.id
          WHERE b.entity_type = 'project'
            AND b.entity_id = $1::uuid
            AND bi.product_id IS NOT NULL
          GROUP BY bi.product_id
       ),
       spent AS (
         SELECT epl.product_id,
                COALESCE(SUM(epl.quantity), 0) AS spent_qty,
                COALESCE(SUM(epl.quantity * COALESCE(epl.unit_price, 0)), 0) AS actual_spend
           FROM expense_product_links epl
           JOIN project_expenses pe ON pe.id = epl.expense_id
          WHERE pe.project_id = $1::uuid
            AND pe.deleted_at IS NULL
            AND epl.product_id IS NOT NULL
          GROUP BY epl.product_id
       )
       SELECT t.product_id,
              t.name,
              t.unit,
              t.target_qty,
              COALESCE(s.spent_qty, 0)        AS spent_qty,
              t.unit_price,
              COALESCE(s.actual_spend, 0)     AS actual_spend
         FROM bom_targets t
         LEFT JOIN spent s ON s.product_id = t.product_id
        ORDER BY t.name`,
      [projectId],
    );

    interface ProcurementItem {
      productId: string;
      name: string;
      unit: string;
      targetQty: number;
      spentQty: number;
      status: 'pending' | 'partial' | 'procured';
      over: boolean;
      remaining: number;
      unitPrice: number | null;
      targetSpend: number | null;
      actualSpend: number;
    }

    const items: ProcurementItem[] = rows.map(
      (r: {
        product_id: string;
        name: string;
        unit: string;
        target_qty: string;
        spent_qty: string;
        unit_price: string | null;
        actual_spend: string;
      }) => {
        const targetQty = Number(r.target_qty);
        const spentQty = Number(r.spent_qty);
        const unitPrice = r.unit_price === null ? null : Number(r.unit_price);
        const status: 'pending' | 'partial' | 'procured' =
          spentQty <= 0 ? 'pending' : spentQty >= targetQty ? 'procured' : 'partial';
        return {
          productId: r.product_id,
          name: r.name,
          unit: r.unit,
          targetQty,
          spentQty,
          status,
          over: spentQty > targetQty + 1e-6,
          remaining: Math.max(targetQty - spentQty, 0),
          unitPrice,
          targetSpend: unitPrice !== null ? unitPrice * targetQty : null,
          actualSpend: Number(r.actual_spend),
        };
      },
    );

    return {
      items,
      totals: {
        totalProducts: items.length,
        pending: items.filter((i: ProcurementItem) => i.status === 'pending').length,
        partial: items.filter((i: ProcurementItem) => i.status === 'partial').length,
        procured: items.filter((i: ProcurementItem) => i.status === 'procured').length,
        overProcuredProducts: items.filter((i: ProcurementItem) => i.over).length,
        targetSpend: items.reduce((s: number, i: ProcurementItem) => s + (i.targetSpend ?? 0), 0),
        actualSpend: items.reduce((s: number, i: ProcurementItem) => s + i.actualSpend, 0),
      },
    };
  }
}

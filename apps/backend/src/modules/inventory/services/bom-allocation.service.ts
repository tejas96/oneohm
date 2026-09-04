import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  InventoryTransactionType,
  StockAllocationSourceType,
  StockAllocationStatus,
} from '@tejas96/shared/types';
import { DataSource, EntityManager, IsNull, Not } from 'typeorm';

import { BomItemEntity } from '../../bom/entities/bom-item.entity';
import { BomEntity } from '../../bom/entities/bom.entity';
import { BomRepository } from '../../bom/repositories/bom.repository';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { InventoryStockEntity } from '../entities/inventory-stock.entity';
import { InventoryTransactionEntity } from '../entities/inventory-transaction.entity';
import { StockAllocationEntity } from '../entities/stock-allocation.entity';

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

/**
 * Stock reservation for BOMs.
 *
 * Reservation belongs to inventory, not BOM: it locks and mutates
 * inventory_stock / stock_allocations rows. Moved out of BomService (which
 * only needed to trigger it), removing the circular module reference that
 * used to route this dependency the long way around.
 */
@Injectable()
export class BomAllocationService {
  constructor(
    private readonly bomRepository: BomRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Reserve stock for all pending BOM product lines.
   *
   * Reads the project's defaultWarehouseId (fails with 400 if not set).
   * Partial allocation is normal — items without sufficient stock are returned
   * in the `pendingStock` array.  Idempotent: already-satisfied lines are skipped.
   *
   * Lock order: BOM row → inventory_stock row (via reserveForProduct).
   */
  async allocatePending(
    bomId: string,
    userId: string,
  ): Promise<{
    allocated: Array<{ productId: string; name: string; reserved: number }>;
    pendingStock: Array<{ productId: string; name: string; shortfall: number }>;
    alreadySatisfied: Array<{ productId: string; name: string }>;
  }> {
    const bom = await this.bomRepository.findById(bomId);
    if (!bom) throw new NotFoundException(`BOM ${bomId} not found`);

    if (!bom.items?.length) {
      throw new BadRequestException('No BOM for this project. Create or sync materials first.');
    }

    // Resolve project's warehouse
    const projectRow = await this.dataSource
      .getRepository(ProjectEntity)
      .findOne({ where: { id: bom.projectId }, select: ['id', 'defaultWarehouseId'] });

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
      const items = await itemRepo.find({ where: { bomId }, relations: ['product'] });

      // Group by productId. quantity is NUMERIC (string) now, and a per_kw
      // line's quantity is kW — which is not a reservable unit. Only
      // per_unit lines reserve stock, and a removed line (quantity 0)
      // reserves nothing.
      const groupedItems = items.reduce<
        Map<string, { productId: string; name: string; totalQty: number }>
      >((acc, item) => {
        if (!item.productId) return acc;
        if (item.pricingBasis !== 'per_unit') return acc;
        const qty = Number(item.quantity);
        if (qty <= 0) return acc;
        const existing = acc.get(item.productId);
        if (existing) {
          existing.totalQty += qty;
        } else {
          acc.set(item.productId, {
            productId: item.productId,
            name: item.product?.name ?? item.productId,
            totalQty: qty,
          });
        }
        return acc;
      }, new Map());

      const allocated: Array<{ productId: string; name: string; reserved: number }> = [];
      const pendingStock: Array<{ productId: string; name: string; shortfall: number }> = [];
      const alreadySatisfied: Array<{ productId: string; name: string }> = [];

      for (const { productId, name, totalQty } of groupedItems.values()) {
        const alloc = await this.reserveForProduct(
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

      return { allocated, pendingStock, alreadySatisfied };
    });

    return result;
  }

  /**
   * Reserve stock for one product line within an open transaction.
   *
   * Lock order: (caller holds BOM lock) → inventory_stock row.
   *
   * @returns { reserved, shortfall, status }
   *   status: 'satisfied' | 'partial' | 'new'
   */
  async reserveForProduct(
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
    // and makes statusByProduct correctly count it toward BOM coverage.
    if (!existingAlloc) {
      const manualAlloc = await allocRepo.findOne({
        where: {
          bomId: IsNull(),
          projectId: bom.projectId,
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
        projectId: bom.projectId,
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
  async releaseReservation(
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

  /**
   * Per-product allocation status for a BOM, computed from live allocations.
   *
   * Only per_unit lines with quantity > 0 count toward requirement — a
   * per_kw line's quantity is kW (not a reservable unit) and a removed
   * line keeps its row at zero.
   *
   * Returns the map instead of writing it to bom.allocation_status: that
   * column no longer exists, and the caller always recomputed and
   * overwrote it anyway.
   */
  async statusByProduct(
    bomId: string,
  ): Promise<Record<string, 'allocated' | 'partial' | 'pending'>> {
    const itemRepo = this.dataSource.getRepository(BomItemEntity);
    const allocRepo = this.dataSource.getRepository(StockAllocationEntity);

    const items = await itemRepo.find({ where: { bomId } });

    const required = new Map<string, number>();
    for (const item of items) {
      if (!item.productId) continue;
      if (item.pricingBasis !== 'per_unit') continue;
      const qty = Number(item.quantity);
      if (qty <= 0) continue;
      required.set(item.productId, (required.get(item.productId) ?? 0) + qty);
    }

    const productAllocationStatus: Record<string, 'allocated' | 'partial' | 'pending'> = {};
    if (required.size === 0) return productAllocationStatus;

    const activeAllocs = await allocRepo.find({
      where: { bomId, status: Not(StockAllocationStatus.CANCELLED) },
      select: ['productId', 'allocatedQuantity'],
    });

    const reserved = new Map<string, number>();
    for (const a of activeAllocs) {
      reserved.set(a.productId, (reserved.get(a.productId) ?? 0) + Number(a.allocatedQuantity));
    }

    for (const [productId, requiredQty] of required) {
      const reservedQty = reserved.get(productId) ?? 0;
      if (reservedQty >= requiredQty) {
        productAllocationStatus[productId] = 'allocated';
      } else if (reservedQty > 0) {
        productAllocationStatus[productId] = 'partial';
      } else {
        productAllocationStatus[productId] = 'pending';
      }
    }

    return productAllocationStatus;
  }
}

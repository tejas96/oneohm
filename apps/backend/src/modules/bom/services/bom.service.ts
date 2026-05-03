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
import { SERIALIZED_BOM_ITEM_TYPES, StockAllocationSourceType } from '@oneohm-epc/shared/types';
import { DataSource, EntityManager, In, QueryFailedError } from 'typeorm';

import { StockAllocationService } from '../../inventory/services/stock-allocation.service';
import { CalculateQuoteResponseDto } from '../../quotes/dto/calculator/calculate-quote-response.dto';
import { BomItemEntity } from '../entities/bom-item.entity';
import { BomEntity } from '../entities/bom.entity';
import { BomRepository } from '../repositories/bom.repository';

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
    organizationId: string,
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
      sortOrder = this.appendBomLineItems(
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
      organizationId,
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
    organizationId: string,
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
      organizationId,
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
    organizationId: string,
    entityType: string,
    entityId: string,
  ): Promise<BomEntity | null> {
    return this.bomRepository.findByEntity(organizationId, entityType, entityId);
  }

  async deleteByEntity(
    organizationId: string,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    return this.bomRepository.deleteByEntity(organizationId, entityType, entityId);
  }

  /**
   * Finalize BOM and auto-create stock allocations for each line item.
   * Idempotent: if BOM status is already 'allocated', returns existing allocations.
   * Atomic: all allocations or none.
   */
  async finalizeAndAllocate(
    organizationId: string,
    bomId: string,
    warehouseId: string,
    userId: string,
  ): Promise<{
    bom: BomEntity;
    shortages: Array<{ productId: string; name: string; available: number; required: number }>;
  }> {
    // Fetch BOM with items
    const bom = await this.bomRepository.findByEntityId(bomId, organizationId);
    if (!bom) throw new NotFoundException(`BOM ${bomId} not found`);

    // Idempotency check
    if (bom.status === 'allocated') {
      return { bom, shortages: [] };
    }

    if (!['finalized', 'draft'].includes(bom.status)) {
      throw new BadRequestException(`Cannot allocate BOM in status ${bom.status}`);
    }

    const projectId = bom.entityId;
    if (bom.entityType !== 'project') {
      throw new BadRequestException('Can only allocate BOMs associated with a project');
    }

    // Check stock sufficiency for all product-linked line items (grouped by product)
    const productItems = bom.items?.filter((item) => item.productId) ?? [];
    const groupedProductItems = productItems.reduce<
      Map<string, { productId: string; name: string; requiredQuantity: number }>
    >((acc, item) => {
      const productId = item.productId!;
      const existing = acc.get(productId);
      if (existing) {
        existing.requiredQuantity += item.quantity;
      } else {
        acc.set(productId, {
          productId,
          name: item.name,
          requiredQuantity: item.quantity,
        });
      }
      return acc;
    }, new Map());

    const shortages: Array<{
      productId: string;
      name: string;
      available: number;
      required: number;
    }> = [];

    for (const groupedItem of groupedProductItems.values()) {
      const { InventoryStockEntity } = await import(
        '../../inventory/entities/inventory-stock.entity'
      );
      const stockRepo = this.dataSource.getRepository(InventoryStockEntity);
      const stock = await stockRepo.findOne({
        where: { organizationId, warehouseId, productId: groupedItem.productId },
      });

      const available = stock ? Number(stock.availableQuantity) : 0;
      if (available < groupedItem.requiredQuantity) {
        shortages.push({
          productId: groupedItem.productId,
          name: groupedItem.name,
          available,
          required: groupedItem.requiredQuantity,
        });
      }
    }

    if (shortages.length > 0) {
      return { bom, shortages };
    }

    // Create one allocation per product
    for (const groupedItem of groupedProductItems.values()) {
      await this.stockAllocationService.create(
        organizationId,
        {
          projectId,
          warehouseId,
          productId: groupedItem.productId,
          allocatedQuantity: groupedItem.requiredQuantity,
          sourceType: StockAllocationSourceType.OWN,
          notes: `Auto-allocated from BOM ${bom.bomNumber} — ${groupedItem.name}`,
        },
        userId,
      );
    }

    // Update BOM status to allocated
    await this.dataSource
      .createQueryBuilder()
      .update(BomEntity)
      .set({ status: 'allocated' })
      .where('id = :id', { id: bomId })
      .execute();

    const updated = await this.bomRepository.findByEntityId(bomId, organizationId);
    return { bom: updated!, shortages: [] };
  }

  async updateItemSerial(
    organizationId: string,
    itemId: string,
    serialNumber: string | null,
  ): Promise<BomItemEntity> {
    const updatedId = await this.dataSource.transaction(async (manager) => {
      const item = await this.findBomItemForOrg(manager, organizationId, itemId);
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
    organizationId: string,
    updates: Array<{ id: string; serialNumber: string | null }>,
  ): Promise<BomItemEntity[]> {
    const updatedItemIds = await this.dataSource.transaction(async (manager) => {
      const ids: string[] = [];
      for (const update of updates) {
        const item = await this.findBomItemForOrg(manager, organizationId, update.id);
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
    organizationId: string,
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
      .where('bom.organizationId = :organizationId', { organizationId })
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
    organizationId: string,
    itemId: string,
  ): Promise<BomItemEntity> {
    const item = await manager
      .getRepository(BomItemEntity)
      .createQueryBuilder('item')
      .innerJoinAndSelect('item.bom', 'bom')
      .where('item.id = :itemId', { itemId })
      .andWhere('bom.organizationId = :organizationId', { organizationId })
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
}

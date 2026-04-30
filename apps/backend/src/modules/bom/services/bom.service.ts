import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { StockAllocationSourceType } from '@oneohm-epc/shared/types';
import { DataSource } from 'typeorm';

import { StockAllocationService } from '../../inventory/services/stock-allocation.service';
import { CalculateQuoteResponseDto } from '../../quotes/dto/calculator/calculate-quote-response.dto';
import { BomItemEntity } from '../entities/bom-item.entity';
import { BomEntity } from '../entities/bom.entity';
import { BomRepository } from '../repositories/bom.repository';

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

    // Map panels
    for (const panel of calculation.panels) {
      items.push({
        itemType: 'panel',
        productId: panel.productId,
        name: panel.name,
        brand: panel.brand,
        specifications: {
          isDcr: panel.isDcr,
          technology: panel.technology,
          wattagePerPanel: panel.wattagePerPanel,
          pricePerWatt: panel.pricePerWatt,
          performanceWarrantyYears: panel.performanceWarrantyYears,
        },
        quantity: panel.quantity,
        unit: 'nos',
        unitPrice: panel.lineTotal / panel.quantity,
        totalPrice: panel.lineTotal,
        gstRate: panel.gstRate,
        gstAmount: panel.gstAmount,
        warrantyYears: panel.productWarrantyYears,
        sortOrder: sortOrder++,
      });
    }

    // Map inverters
    for (const inv of calculation.inverters.inverters) {
      items.push({
        itemType: 'inverter',
        productId: inv.productId,
        name: inv.name,
        brand: inv.brand,
        specifications: { capacityKw: inv.capacityKw },
        quantity: inv.quantity,
        unit: 'nos',
        unitPrice: inv.unitPrice,
        totalPrice: inv.lineTotal,
        gstRate: inv.gstRate,
        gstAmount: inv.gstAmount,
        warrantyYears: inv.productWarrantyYears,
        sortOrder: sortOrder++,
      });
    }

    // Map structure
    items.push({
      itemType: 'structure',
      productId: calculation.structure.productId,
      name: calculation.structure.name,
      specifications: { structureType: calculation.structure.structureType },
      quantity: calculation.structure.quantity,
      unit: 'set',
      unitPrice: calculation.structure.unitPrice,
      totalPrice: calculation.structure.lineTotal,
      gstRate: calculation.structure.gstRate,
      gstAmount: calculation.structure.gstAmount,
      sortOrder: sortOrder++,
    });

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

    // Check stock sufficiency for all items with productId
    const productItems = bom.items?.filter((item) => item.productId) ?? [];
    const shortages: Array<{
      productId: string;
      name: string;
      available: number;
      required: number;
    }> = [];

    for (const item of productItems) {
      const { InventoryStockEntity } = await import(
        '../../inventory/entities/inventory-stock.entity'
      );
      const stockRepo = this.dataSource.getRepository(InventoryStockEntity);
      const stock = await stockRepo.findOne({
        where: { organizationId, warehouseId, productId: item.productId! },
      });

      const available = stock ? Number(stock.availableQuantity) : 0;
      if (available < item.quantity) {
        shortages.push({
          productId: item.productId!,
          name: item.name,
          available,
          required: item.quantity,
        });
      }
    }

    if (shortages.length > 0) {
      return { bom, shortages };
    }

    // Create allocations atomically for each product item
    for (const item of productItems) {
      await this.stockAllocationService.create(
        organizationId,
        {
          projectId,
          warehouseId,
          productId: item.productId!,
          allocatedQuantity: item.quantity,
          sourceType: StockAllocationSourceType.OWN,
          notes: `Auto-allocated from BOM ${bom.bomNumber} — ${item.name}`,
        },
        userId,
      );
    }

    // Update BOM status to allocated
    await this.dataSource
      .createQueryBuilder()
      .update(BomEntity)
      .set({ status: 'allocated', updatedBy: userId })
      .where('id = :id', { id: bomId })
      .execute();

    const updated = await this.bomRepository.findByEntityId(bomId, organizationId);
    return { bom: updated!, shortages: [] };
  }
}

import { Injectable, Logger } from '@nestjs/common';

import { CalculateQuoteResponseDto } from '../../quotes/dto/calculator/calculate-quote-response.dto';
import { BomItemEntity } from '../entities/bom-item.entity';
import { BomEntity } from '../entities/bom.entity';
import { BomRepository } from '../repositories/bom.repository';

@Injectable()
export class BomService {
  private readonly logger = new Logger(BomService.name);

  constructor(private readonly bomRepository: BomRepository) {}

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
}

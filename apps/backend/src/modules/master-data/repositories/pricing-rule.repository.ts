import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { PricingRuleEntity } from '../entities/pricing-rule.entity';

/**
 * Pricing Rule Repository
 * Handles database operations for pricing rules
 */
@Injectable()
export class PricingRuleRepository {
  constructor(
    @InjectRepository(PricingRuleEntity)
    private readonly repository: Repository<PricingRuleEntity>,
  ) {}

  /**
   * Find active pricing rule for a product
   * Returns the highest priority active rule
   */
  async findByProductId(
    organizationId: string,
    productId: string,
  ): Promise<PricingRuleEntity | null> {
    return this.repository.findOne({
      where: {
        organizationId,
        productId,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: { priority: 'DESC' },
    });
  }

  /**
   * Find all pricing rules for a product
   */
  async findAllByProductId(
    organizationId: string,
    productId: string,
  ): Promise<PricingRuleEntity[]> {
    return this.repository.find({
      where: {
        organizationId,
        productId,
        deletedAt: IsNull(),
      },
      order: { priority: 'DESC', effectiveFrom: 'DESC' },
    });
  }

  /**
   * Find pricing rules by product type
   */
  async findByProductType(
    organizationId: string,
    productType: string,
  ): Promise<PricingRuleEntity[]> {
    return this.repository.find({
      where: {
        organizationId,
        productType,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: { priority: 'DESC' },
    });
  }

  /**
   * Create a new pricing rule
   */
  async create(
    organizationId: string,
    data: Partial<PricingRuleEntity>,
  ): Promise<PricingRuleEntity> {
    const rule = this.repository.create({
      ...data,
      organizationId,
    });
    return this.repository.save(rule);
  }

  /**
   * Update a pricing rule
   */
  async update(
    id: string,
    organizationId: string,
    data: Partial<PricingRuleEntity>,
  ): Promise<PricingRuleEntity> {
    await this.repository.update({ id, organizationId }, {
      ...data,
      updatedAt: new Date(),
    } as QueryDeepPartialEntity<PricingRuleEntity>);
    const updated = await this.repository.findOne({
      where: { id, organizationId },
    });
    if (!updated) {
      throw new Error('Pricing rule not found after update');
    }
    return updated;
  }

  /**
   * Soft delete a pricing rule
   */
  async softDelete(id: string, organizationId: string): Promise<void> {
    await this.repository.update({ id, organizationId }, { deletedAt: new Date() });
  }
}

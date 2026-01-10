import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductType, ProjectType, PricingRuleType } from '@oneohm-epc/shared-types';
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
   * @deprecated Use findByProductIdWithContext for proper project type and date filtering
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
   * Find active pricing rule for a product with full context
   * Considers project type and effective dates
   * Returns the highest priority matching rule
   *
   * Fallback Chain (single optimized query):
   * 1. Exact project_type match (highest priority)
   * 2. Fallback to 'residential' (for DCR panels)
   * 3. Fallback to 'commercial' (for Non-DCR panels)
   * 4. Fallback to NULL project_type (universal)
   *
   * Business Logic:
   * - DCR panels: residential pricing applies to residential_apartment too
   * - Non-DCR panels: commercial pricing applies to residential (above 3KW), industrial, agricultural
   */
  async findByProductIdWithContext(
    organizationId: string,
    productId: string,
    projectType?: ProjectType,
    asOfDate?: Date,
  ): Promise<PricingRuleEntity | null> {
    const date = asOfDate || new Date();
    const dateStr = date.toISOString().split('T')[0];

    const query = this.repository
      .createQueryBuilder('rule')
      .where('rule.organization_id = :organizationId', { organizationId })
      .andWhere('rule.product_id = :productId', { productId })
      .andWhere('rule.is_active = true')
      .andWhere('rule.deleted_at IS NULL')
      .andWhere('rule.effective_from <= :date', { date: dateStr })
      .andWhere('(rule.effective_to IS NULL OR rule.effective_to >= :date)', { date: dateStr });

    if (projectType) {
      // Include all possible fallback project types in the query
      // This allows finding a rule even if exact match doesn't exist
      query.andWhere(
        `(rule.project_type = :projectType 
          OR rule.project_type = :residential 
          OR rule.project_type = :commercial 
          OR rule.project_type IS NULL)`,
        {
          projectType,
          residential: ProjectType.RESIDENTIAL,
          commercial: ProjectType.COMMERCIAL,
        },
      );

      // Order by fallback priority:
      // 0 = exact match, 1 = residential (DCR fallback), 2 = commercial (Non-DCR fallback), 3 = NULL (universal)
      query.orderBy(
        `CASE 
          WHEN rule.project_type = :projectType THEN 0
          WHEN rule.project_type = :residential THEN 1
          WHEN rule.project_type = :commercial THEN 2
          WHEN rule.project_type IS NULL THEN 3
          ELSE 4
        END`,
        'ASC',
      );
      query.setParameters({
        projectType,
        residential: ProjectType.RESIDENTIAL,
        commercial: ProjectType.COMMERCIAL,
      });
      query.addOrderBy('rule.priority', 'DESC');
    } else {
      query.orderBy('rule.priority', 'DESC');
    }

    return query.getOne();
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
    productType: ProductType,
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
   * Find pricing rules by product type and project type
   * Used for quote calculation with project context
   */
  async findByProductAndProjectType(
    organizationId: string,
    productType: ProductType,
    projectType: ProjectType,
    asOfDate?: Date,
  ): Promise<PricingRuleEntity[]> {
    const date = asOfDate || new Date();

    return this.repository
      .createQueryBuilder('rule')
      .where('rule.organization_id = :organizationId', { organizationId })
      .andWhere('rule.product_type = :productType', { productType })
      .andWhere('rule.project_type = :projectType', { projectType })
      .andWhere('rule.is_active = true')
      .andWhere('rule.deleted_at IS NULL')
      .andWhere('rule.effective_from <= :date', { date })
      .andWhere('(rule.effective_to IS NULL OR rule.effective_to >= :date)', { date })
      .orderBy('rule.priority', 'DESC')
      .getMany();
  }

  /**
   * Find all active pricing rules for an organization
   */
  async findAllActive(
    organizationId: string,
    filters?: {
      productType?: ProductType;
      projectType?: ProjectType;
      ruleType?: PricingRuleType;
    },
  ): Promise<PricingRuleEntity[]> {
    const query = this.repository
      .createQueryBuilder('rule')
      .where('rule.organization_id = :organizationId', { organizationId })
      .andWhere('rule.is_active = true')
      .andWhere('rule.deleted_at IS NULL');

    if (filters?.productType) {
      query.andWhere('rule.product_type = :productType', { productType: filters.productType });
    }

    if (filters?.projectType) {
      query.andWhere('rule.project_type = :projectType', { projectType: filters.projectType });
    }

    if (filters?.ruleType) {
      query.andWhere('rule.rule_type = :ruleType', { ruleType: filters.ruleType });
    }

    return query.orderBy('rule.priority', 'DESC').getMany();
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

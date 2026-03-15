import {
  PricingRuleType,
  ProductType,
  ProjectType,
  PricingRuleFormula,
} from '@oneohm-epc/shared/types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { ProductEntity } from './product.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Pricing Rule Entity
 * Dynamic pricing strategies with flexible formulas
 *
 * Supports:
 * - Product-specific pricing (by productId)
 * - Product type-level pricing (by productType)
 * - Project type-level pricing (by projectType)
 * - Time-based validity (effectiveFrom/To)
 * - Priority-based rule selection
 *
 * @example
 * // Panel pricing rule
 * {
 *   name: 'Adani PERC DCR - Residential',
 *   code: 'ADANI-PERC-DCR-RES',
 *   ruleType: 'base_price',
 *   productId: 'prod-001',
 *   projectType: 'residential',
 *   formula: { pricePerWatt: 25.75, gstRate: 5 },
 *   effectiveFrom: '2024-01-01',
 *   priority: 10,
 *   isActive: true
 * }
 */
@Entity('pricing_rules')
@Index(['organizationId', 'code'], { unique: true })
@Index(['organizationId', 'deletedAt'])
@Index(['productId', 'deletedAt'])
@Index(['ruleType', 'deletedAt'])
@Index(['effectiveFrom', 'effectiveTo', 'isActive'])
@Index(['organizationId', 'productType', 'projectType', 'isActive'])
export class PricingRuleEntity extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  // ==================== Basic Info ====================
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // ==================== Rule Type ====================
  /**
   * Type of pricing rule
   * - base_price: Standard product pricing
   * - volume_discount: Quantity-based discounts
   * - customer_type: Customer category pricing
   * - seasonal: Time-based promotions
   * - promotional: Special offers
   * - project_type: Project category pricing
   */
  @Column({ name: 'rule_type', type: 'varchar', length: 50 })
  ruleType!: PricingRuleType;

  // ==================== Applicability ====================

  /**
   * Specific product this rule applies to (optional)
   * If set, this rule only applies to this product
   */
  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId?: string;

  /**
   * Product type this rule applies to (optional)
   * If set without productId, applies to all products of this type
   */
  @Column({ name: 'product_type', type: 'varchar', length: 50, nullable: true })
  productType?: ProductType;

  /**
   * Project type this rule applies to (optional)
   * - residential: Individual homes
   * - residential_apartment: Apartment common areas
   * - commercial: Business premises
   * - industrial: Factories, warehouses
   * - agricultural: Farm installations
   */
  @Column({ name: 'project_type', type: 'varchar', length: 50, nullable: true })
  projectType?: ProjectType;

  // ==================== Pricing Formula ====================
  /**
   * Pricing formula configuration (JSONB)
   *
   * Structure depends on product type:
   * - Solar panels: { pricePerWatt, gstRate, isDcr }
   * - Inverters: { basePrice, gstRate, phaseType, capacityRange }
   * - Structures: { pricePerKw, gstRate, structureType }
   * - General: { marginPercentage, volumeDiscounts, customerTypeMultipliers }
   *
   * @see PricingRuleFormula in @oneohm-epc/shared/types
   */
  @Column({ type: 'jsonb' })
  formula!: PricingRuleFormula;

  // ==================== Date Range ====================

  /**
   * Date from which this pricing rule is effective
   */
  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom!: Date;

  /**
   * Date until which this pricing rule is effective
   * NULL means no end date (currently active)
   */
  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo?: Date;

  // ==================== Priority ====================

  /**
   * Priority for rule selection when multiple rules match
   * Higher number = higher priority (wins)
   * Default: 0
   */
  @Column({ type: 'integer', default: 0 })
  priority!: number;

  // ==================== Status ====================

  /**
   * Whether this pricing rule is currently active
   */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  // ==================== Audit Fields ====================
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  // ==================== Relationships ====================
  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

  @ManyToOne(() => ProductEntity, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product?: ProductEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;
}

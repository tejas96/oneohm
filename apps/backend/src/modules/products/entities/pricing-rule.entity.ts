import { PricingRuleType, ProjectType } from '@oneohm-epc/shared-types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { ProductEntity } from './product.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Pricing Rule Entity
 * Dynamic pricing strategies with flexible formulas
 */
@Entity('pricing_rules')
@Index(['organizationId', 'code'], { unique: true })
@Index(['organizationId', 'deletedAt'])
@Index(['productId', 'deletedAt'])
@Index(['ruleType', 'deletedAt'])
@Index(['effectiveFrom', 'effectiveTo', 'isActive'])
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
  @Column({ name: 'rule_type', type: 'varchar', length: 50 })
  ruleType!: PricingRuleType;

  // ==================== Applicability ====================
  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId?: string;

  @Column({ name: 'product_type', type: 'varchar', length: 50, nullable: true })
  productType?: string;

  @Column({ name: 'project_type', type: 'varchar', length: 50, nullable: true })
  projectType?: ProjectType;

  // ==================== Pricing Formula ====================
  /**
   * Flexible pricing formula structure:
   * {
   *   basePrice?: number,
   *   marginPercentage?: number,
   *   volumeDiscounts?: [
   *     { minQuantity: number, discountPercentage: number }
   *   ],
   *   customerTypeMultipliers?: {
   *     retail: number,
   *     reseller: number,
   *     wholesale: number
   *   },
   *   additionalCosts?: {
   *     installation?: number,
   *     transportation?: number,
   *     gst?: number
   *   }
   * }
   */
  @Column({ type: 'jsonb' })
  formula!: {
    basePrice?: number;
    marginPercentage?: number;
    volumeDiscounts?: Array<{
      minQuantity: number;
      discountPercentage: number;
    }>;
    customerTypeMultipliers?: {
      retail?: number;
      reseller?: number;
      wholesale?: number;
    };
    additionalCosts?: {
      installation?: number;
      transportation?: number;
      gst?: number;
    };
  };

  // ==================== Date Range ====================
  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom!: Date;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo?: Date;

  // ==================== Priority ====================
  @Column({ type: 'integer', default: 0 })
  priority!: number;

  // ==================== Status ====================
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

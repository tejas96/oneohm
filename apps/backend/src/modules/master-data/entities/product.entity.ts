import {
  ProductStatus,
  ProductType,
  UnitOfMeasure,
  ProductSpecifications,
} from '@oneohm-epc/shared/types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { ProductCategoryEntity } from './product-category.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { UserEntity } from '../../users/entities/user.entity';

// Re-export for backward compatibility
export type { ProductSpecifications } from '@oneohm-epc/shared/types';

/**
 * Product Entity
 * Represents solar equipment and materials
 * Hybrid specifications: common fields + flexible JSONB
 */
@Entity('products')
@Index(['organizationId', 'code'], { unique: true })
@Index(['organizationId', 'status', 'deletedAt'])
@Index(['categoryId', 'deletedAt'])
@Index(['type', 'deletedAt'])
@Index(['brand', 'deletedAt'])
export class ProductEntity extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId?: string;

  // ==================== Basic Info ====================
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // ==================== Product Type ====================
  @Column({ type: 'varchar', length: 50 })
  type!: ProductType;

  // ==================== Specifications (Hybrid Approach) ====================
  /**
   * Strongly typed specifications for different product types.
   * Use the appropriate section based on product type:
   * - panel: For solar panels (isDcr, technology, wattage range)
   * - inverter: For inverters (capacity, phase, system size range)
   * - structure: For mounting structures (type, material)
   * - common: For general specs (efficiency, dimensions, weight)
   * - additional: For any custom fields
   */
  @Column({ type: 'jsonb', nullable: true })
  specifications?: ProductSpecifications;

  // ==================== Brand & Manufacturer ====================
  @Column({ type: 'varchar', length: 100, nullable: true })
  brand?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  manufacturer?: string;

  @Column({ name: 'model_number', type: 'varchar', length: 100, nullable: true })
  modelNumber?: string;

  // ==================== Unit ====================
  @Column({
    name: 'unit_of_measure',
    type: 'varchar',
    length: 20,
    default: UnitOfMeasure.PIECES,
  })
  unitOfMeasure!: UnitOfMeasure;

  // ==================== Warranty ====================
  @Column({ name: 'product_warranty_years', type: 'integer', nullable: true })
  productWarrantyYears?: number;

  @Column({ name: 'performance_warranty_years', type: 'integer', nullable: true })
  performanceWarrantyYears?: number;

  // ==================== Status ====================
  @Column({
    type: 'varchar',
    length: 20,
    default: ProductStatus.ACTIVE,
  })
  status!: ProductStatus;

  // ==================== Audit Fields ====================
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  // ==================== Relationships ====================

  /**
   * Organization relationship
   * @lazy Load with: .relations(['organization'])
   */
  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;

  /**
   * Product category relationship
   * @lazy Load with: .relations(['category'])
   */
  @ManyToOne(() => ProductCategoryEntity, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: ProductCategoryEntity;

  /**
   * Creator user relationship
   * @lazy Load with: .relations(['creator'])
   */
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;

  /**
   * Updater user relationship
   * @lazy Load with: .relations(['updater'])
   */
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;
}

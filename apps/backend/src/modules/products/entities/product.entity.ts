import { ProductStatus, ProductType, UnitOfMeasure } from '@oneohm-epc/shared-types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { ProductCategoryEntity } from './product-category.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { UserEntity } from '../../users/entities/user.entity';

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
   * Hybrid specifications structure:
   * {
   *   common: {
   *     wattage?: number,
   *     capacity?: number,
   *     voltage?: string,
   *     efficiency?: number,
   *     dimensions?: string,
   *     weight?: number
   *   },
   *   additional: {
   *     [key: string]: any
   *   }
   * }
   */
  @Column({ type: 'jsonb', nullable: true })
  specifications?: {
    common?: {
      wattage?: number;
      capacity?: number;
      voltage?: string;
      efficiency?: number;
      dimensions?: string;
      weight?: number;
      inputVoltage?: string;
      outputVoltage?: string;
      phases?: number;
      mpptChannels?: number;
      cellType?: string;
      chemistry?: string;
      cycleLife?: number;
      depthOfDischarge?: number;
    };
    additional?: Record<string, unknown>;
  };

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
  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

  @ManyToOne(() => ProductCategoryEntity, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: ProductCategoryEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;
}

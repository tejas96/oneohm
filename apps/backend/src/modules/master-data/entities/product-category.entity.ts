import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Product Category Entity
 * Hierarchical structure for organizing products
 * Supports 3-level hierarchy: Category → Subcategory → Product Type
 *
 * @example
 * // Root category
 * { name: 'Solar Equipment', code: 'SOLAR', parentCategoryId: null }
 *
 * // Child category
 * { name: 'Solar Panels', code: 'PANELS', parentCategoryId: 'cat-001' }
 */
@Entity('product_categories')
@Index(['organizationId', 'code'], { unique: true })
@Index(['organizationId', 'deletedAt'])
@Index(['parentCategoryId'])
export class ProductCategoryEntity extends BaseEntity {
  // ==================== Foreign Keys ====================

  /**
   * Organization this category belongs to
   */
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  // ==================== Basic Info ====================

  /**
   * Display name of the category
   */
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /**
   * Unique code within the organization
   */
  @Column({ type: 'varchar', length: 50 })
  code!: string;

  /**
   * Optional description
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  // ==================== Hierarchy ====================

  /**
   * Parent category ID for hierarchy
   * NULL means this is a root category
   */
  @Column({ name: 'parent_category_id', type: 'uuid', nullable: true })
  parentCategoryId?: string;

  // ==================== Audit Fields ====================

  /**
   * Soft delete timestamp
   */
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  /**
   * User who created this category
   */
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  /**
   * User who last updated this category
   */
  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  // ==================== Relationships ====================
  // Note: All relationships are optional because they're lazy-loaded
  // Use .relations(['organization']) in queries to load them

  /**
   * Organization relationship
   * @lazy Load with: .relations(['organization'])
   */
  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;

  /**
   * Parent category (for hierarchy)
   * @lazy Load with: .relations(['parentCategory'])
   */
  @ManyToOne(() => ProductCategoryEntity, (category) => category.childCategories, {
    nullable: true,
  })
  @JoinColumn({ name: 'parent_category_id' })
  parentCategory?: ProductCategoryEntity;

  /**
   * Child categories (for hierarchy)
   * @lazy Load with: .relations(['childCategories'])
   */
  @OneToMany(() => ProductCategoryEntity, (category) => category.parentCategory)
  childCategories?: ProductCategoryEntity[];

  /**
   * User who created this category
   * @lazy Load with: .relations(['creator'])
   */
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;

  /**
   * User who last updated this category
   * @lazy Load with: .relations(['updater'])
   */
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;
}

import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Product Category Entity
 * Hierarchical structure for organizing products
 * Supports 3-level hierarchy: Category → Subcategory → Product Type
 */
@Entity('product_categories')
@Index(['organizationId', 'code'], { unique: true })
@Index(['organizationId', 'deletedAt'])
@Index(['parentCategoryId'])
export class ProductCategoryEntity extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  // ==================== Basic Info ====================
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // ==================== Hierarchy ====================
  @Column({ name: 'parent_category_id', type: 'uuid', nullable: true })
  parentCategoryId?: string;

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

  @ManyToOne(() => ProductCategoryEntity, (category) => category.childCategories, {
    nullable: true,
  })
  @JoinColumn({ name: 'parent_category_id' })
  parentCategory?: ProductCategoryEntity;

  @OneToMany(() => ProductCategoryEntity, (category) => category.parentCategory)
  childCategories!: ProductCategoryEntity[];

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;
}


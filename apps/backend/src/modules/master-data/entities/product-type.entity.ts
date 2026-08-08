import { Column, DeleteDateColumn, Entity, Index, OneToMany } from 'typeorm';

import { ProductTypeAttributeEntity } from './product-type-attribute.entity';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('product_types')
@Index(['code'], { unique: true })
export class ProductTypeEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon?: string;

  @Column({ name: 'default_unit_of_measure', type: 'varchar', length: 20, default: 'pcs' })
  defaultUnitOfMeasure!: string;

  @Column({
    name: 'default_pricing_basis',
    type: 'varchar',
    length: 20,
    default: 'per_unit',
  })
  defaultPricingBasis!: string;

  @Column({ name: 'default_gst_rate', type: 'decimal', precision: 5, scale: 2, default: 12 })
  defaultGstRate!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  @OneToMany(() => ProductTypeAttributeEntity, (attr) => attr.productType, { cascade: true })
  attributes?: ProductTypeAttributeEntity[];
}

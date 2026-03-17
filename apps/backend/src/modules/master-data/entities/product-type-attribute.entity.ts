import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { ProductTypeEntity } from './product-type.entity';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('product_type_attributes')
@Index(['productTypeId', 'attributeKey'], { unique: true })
export class ProductTypeAttributeEntity extends BaseEntity {
  @Column({ name: 'product_type_id', type: 'uuid' })
  productTypeId!: string;

  @Column({ name: 'attribute_key', type: 'varchar', length: 50 })
  attributeKey!: string;

  @Column({ type: 'varchar', length: 100 })
  label!: string;

  @Column({ name: 'data_type', type: 'varchar', length: 20 })
  dataType!: string;

  @Column({ name: 'is_required', type: 'boolean', default: false })
  isRequired!: boolean;

  @Column({ name: 'is_filterable', type: 'boolean', default: false })
  isFilterable!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  validation?: Record<string, unknown>;

  @Column({ name: 'default_value', type: 'text', nullable: true })
  defaultValue?: string;

  @Column({ name: 'group_name', type: 'varchar', length: 50, default: 'general' })
  groupName!: string;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;

  @Column({ name: 'help_text', type: 'text', nullable: true })
  helpText?: string;

  @ManyToOne(() => ProductTypeEntity, (pt) => pt.attributes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_type_id' })
  productType?: ProductTypeEntity;
}

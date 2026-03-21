import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BrandEntity } from './brand.entity';
import { ProductTypeEntity } from './product-type.entity';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('brand_product_types')
@Index(['brandId', 'productTypeId'], { unique: true })
export class BrandProductTypeEntity extends BaseEntity {
  @Column({ name: 'brand_id', type: 'uuid' })
  brandId!: string;

  @Column({ name: 'product_type_id', type: 'uuid' })
  productTypeId!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @ManyToOne(() => BrandEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand?: BrandEntity;

  @ManyToOne(() => ProductTypeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_type_id' })
  productType?: ProductTypeEntity;
}

import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { ProductEntity } from './product.entity';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('product_prices')
@Index(['productId', 'isActive', 'effectiveFrom', 'effectiveTo'])
export class ProductPriceEntity extends BaseEntity {

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'project_type', type: 'varchar', length: 50, nullable: true })
  projectType?: string | null;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice!: number;

  @Column({ name: 'cost_multiplier', type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  costMultiplier!: number;

  @Column({ name: 'gst_rate', type: 'decimal', precision: 5, scale: 2 })
  gstRate!: number;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency!: string;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom!: Date;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo?: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;


  @ManyToOne(() => ProductEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product?: ProductEntity;
}

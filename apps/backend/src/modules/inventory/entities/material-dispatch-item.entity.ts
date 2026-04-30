import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { MaterialDispatchEntity } from './material-dispatch.entity';
import { StockAllocationEntity } from './stock-allocation.entity';
import { ProductEntity } from '../../master-data/entities/product.entity';

/**
 * Material Dispatch Item Entity
 * Line items for material dispatches
 */
@Entity('material_dispatch_items')
@Index(['dispatchId'])
@Index(['productId'])
export class MaterialDispatchItemEntity {
  // ==================== Primary Key ====================

  @Column({ type: 'uuid', primary: true, default: () => 'gen_random_uuid()' })
  id!: string;

  // ==================== Relations ====================

  @ManyToOne(() => MaterialDispatchEntity, (dispatch) => dispatch.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dispatch_id' })
  dispatch!: MaterialDispatchEntity;

  @ManyToOne(() => ProductEntity)
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  @ManyToOne(() => StockAllocationEntity, { nullable: true })
  @JoinColumn({ name: 'stock_allocation_id' })
  stockAllocation?: StockAllocationEntity;

  // ==================== Foreign Keys ====================

  @Column({ name: 'dispatch_id', type: 'uuid' })
  dispatchId!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'stock_allocation_id', type: 'uuid', nullable: true })
  stockAllocationId?: string;

  // ==================== Quantity ====================

  @Column({ type: 'decimal', precision: 15, scale: 3 })
  quantity!: number;

  // ==================== Batch/Serial ====================

  @Column({ name: 'batch_number', type: 'varchar', length: 100, nullable: true })
  batchNumber?: string;

  @Column({ name: 'serial_numbers', type: 'text', array: true, nullable: true })
  serialNumbers?: string[];

  // ==================== Notes ====================

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ==================== Audit Fields ====================

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;
}

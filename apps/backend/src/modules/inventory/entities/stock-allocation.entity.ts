import { StockAllocationSourceType, StockAllocationStatus } from '@tejas96/shared/types';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { WarehouseEntity } from './warehouse.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ProductEntity } from '../../master-data/entities/product.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';

/**
 * Stock Allocation Entity
 * Reserves inventory for specific projects
 */
@Entity('stock_allocations')
@Index(['projectId'])
@Index(['warehouseId'])
@Index(['productId'])
@Index(['status'])
export class StockAllocationEntity extends BaseEntity {
  // ==================== Relations ====================

  @ManyToOne(() => ProjectEntity)
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  @ManyToOne(() => WarehouseEntity, (warehouse) => warehouse.stockAllocations)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: WarehouseEntity;

  @ManyToOne(() => ProductEntity)
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  // ==================== Foreign Keys ====================

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  /**
   * Links this allocation back to the specific BOM that requested it.
   * Nullable for legacy allocations that pre-date this column.
   * ON DELETE RESTRICT at the DB layer: a BOM with active allocations cannot be deleted.
   */
  @Column({ name: 'bom_id', type: 'uuid', nullable: true })
  bomId?: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  // ==================== Allocation ====================

  @Column({ name: 'allocated_quantity', type: 'decimal', precision: 15, scale: 3 })
  allocatedQuantity!: number;

  @Column({ name: 'dispatched_quantity', type: 'decimal', precision: 15, scale: 3, default: 0 })
  dispatchedQuantity!: number;

  @Column({ name: 'returned_quantity', type: 'decimal', precision: 15, scale: 3, default: 0 })
  returnedQuantity!: number;

  // ==================== Source Type ====================

  @Column({
    name: 'source_type',
    type: 'enum',
    enum: StockAllocationSourceType,
    default: StockAllocationSourceType.OWN,
  })
  sourceType!: StockAllocationSourceType;

  // ==================== Status ====================

  @Column({
    type: 'enum',
    enum: StockAllocationStatus,
    default: StockAllocationStatus.ALLOCATED,
  })
  status!: StockAllocationStatus;

  // ==================== Dates ====================

  @Column({
    name: 'allocated_at',
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  allocatedAt!: Date;

  @Column({ name: 'dispatched_at', type: 'timestamp with time zone', nullable: true })
  dispatchedAt?: Date;

  @Column({ name: 'returned_at', type: 'timestamptz', nullable: true })
  returnedAt?: Date;

  // ==================== Notes ====================

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ==================== Audit Fields ====================

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;
}

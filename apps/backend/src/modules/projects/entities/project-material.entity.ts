import { MaterialStatus } from '@tejas96/shared/types';
import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { ProjectEntity } from './project.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { StockAllocationEntity } from '../../inventory/entities/stock-allocation.entity';
import { ProductEntity } from '../../master-data/entities/product.entity';

/**
 * Project Material Entity
 * Tracks materials required, allocated, and used in a project
 */
@Entity('project_materials')
export class ProjectMaterialEntity extends BaseEntity {
  // ==================== Relations ====================
  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  @ManyToOne(() => ProjectEntity, (project) => project.materials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  @Column({ type: 'uuid', name: 'product_id', nullable: true })
  productId?: string;

  @ManyToOne(() => ProductEntity, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product?: ProductEntity;

  @Column({ name: 'stock_allocation_id', type: 'uuid', nullable: true })
  stockAllocationId?: string;

  @ManyToOne(() => StockAllocationEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'stock_allocation_id' })
  stockAllocation?: StockAllocationEntity;

  // ==================== Material Details ====================
  @Column({ type: 'varchar', length: 255, name: 'material_name' })
  materialName!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category?: string;

  // ==================== Quantities ====================
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'quantity_required' })
  quantityRequired!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'quantity_allocated' })
  quantityAllocated!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'quantity_used' })
  quantityUsed!: number;

  @Column({ type: 'varchar', length: 50 })
  unit!: string;

  // ==================== Costs ====================
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'unit_cost' })
  unitCost?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'total_cost' })
  totalCost?: number;

  // ==================== Status & Dates ====================
  @Column({
    type: 'varchar',
    length: 50,
    default: MaterialStatus.REQUIRED,
  })
  status!: MaterialStatus;

  @Column({ type: 'date', nullable: true, name: 'procurement_date' })
  procurementDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'allocation_date' })
  allocationDate?: Date;

  // ==================== Soft Delete ====================
  @DeleteDateColumn({ type: 'timestamp', nullable: true, name: 'deleted_at' })
  deletedAt?: Date;

  // ==================== Audit Fields ====================
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;
}

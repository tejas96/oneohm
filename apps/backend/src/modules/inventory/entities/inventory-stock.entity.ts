import { Column, Entity, Index, JoinColumn, ManyToOne, Unique, UpdateDateColumn } from 'typeorm';

import { WarehouseEntity } from './warehouse.entity';
import { ProductEntity } from '../../master-data/entities/product.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';

/**
 * Inventory Stock Entity
 * Real-time stock levels per warehouse and product
 * Note: No soft delete for stock records (always show current state)
 */
@Entity('inventory_stock')
@Unique(['warehouseId', 'productId'])
@Index(['warehouseId'])
@Index(['productId'])
@Index(['warehouseId', 'productId']) // For low stock queries
export class InventoryStockEntity {
  // ==================== Primary Key ====================

  @Column({ type: 'uuid', primary: true, default: () => 'gen_random_uuid()' })
  id!: string;

  // ==================== Relations ====================

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @ManyToOne(() => WarehouseEntity, (warehouse) => warehouse.inventoryStock)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: WarehouseEntity;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @ManyToOne(() => ProductEntity)
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  // ==================== Stock Levels ====================

  @Column({ name: 'available_quantity', type: 'decimal', precision: 15, scale: 3, default: 0 })
  availableQuantity!: number;

  @Column({ name: 'reserved_quantity', type: 'decimal', precision: 15, scale: 3, default: 0 })
  reservedQuantity!: number;

  @Column({ name: 'in_transit_quantity', type: 'decimal', precision: 15, scale: 3, default: 0 })
  inTransitQuantity!: number;

  // ==================== Reorder Settings ====================

  @Column({ name: 'minimum_stock_level', type: 'decimal', precision: 15, scale: 3, nullable: true })
  minimumStockLevel?: number;

  @Column({ name: 'reorder_quantity', type: 'decimal', precision: 15, scale: 3, nullable: true })
  reorderQuantity?: number;

  @Column({ name: 'maximum_stock_level', type: 'decimal', precision: 15, scale: 3, nullable: true })
  maximumStockLevel?: number;

  // ==================== Last Activity ====================

  @Column({ name: 'last_stock_in_date', type: 'date', nullable: true })
  lastStockInDate?: Date;

  @Column({ name: 'last_stock_out_date', type: 'date', nullable: true })
  lastStockOutDate?: Date;

  // ==================== Audit Fields ====================

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}

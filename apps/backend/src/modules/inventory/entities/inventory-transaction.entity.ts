import { InventoryTransactionType } from '@oneohm-epc/shared-types';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { WarehouseEntity } from './warehouse.entity';
import { ProductEntity } from '../../master-data/entities/product.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Inventory Transaction Entity
 * Records all stock movements and changes
 */
@Entity('inventory_transactions')
@Index(['warehouseId'])
@Index(['productId'])
@Index(['transactionType'])
@Index(['transactionDate'])
@Index(['referenceType', 'referenceId'])
export class InventoryTransactionEntity {
  // ==================== Primary Key ====================

  @Column({ type: 'uuid', primary: true, default: () => 'gen_random_uuid()' })
  id!: string;

  // ==================== Relations ====================

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

  @ManyToOne(() => WarehouseEntity, (warehouse) => warehouse.transactions)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: WarehouseEntity;

  @ManyToOne(() => ProductEntity)
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  @ManyToOne(() => WarehouseEntity, (warehouse) => warehouse.outgoingTransfers, { nullable: true })
  @JoinColumn({ name: 'from_warehouse_id' })
  fromWarehouse?: WarehouseEntity;

  @ManyToOne(() => WarehouseEntity, (warehouse) => warehouse.incomingTransfers, { nullable: true })
  @JoinColumn({ name: 'to_warehouse_id' })
  toWarehouse?: WarehouseEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;

  // ==================== Foreign Keys ====================

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'from_warehouse_id', type: 'uuid', nullable: true })
  fromWarehouseId?: string;

  @Column({ name: 'to_warehouse_id', type: 'uuid', nullable: true })
  toWarehouseId?: string;

  // ==================== Transaction Type ====================

  @Column({
    name: 'transaction_type',
    type: 'enum',
    enum: InventoryTransactionType,
  })
  transactionType!: InventoryTransactionType;

  // ==================== Quantity ====================

  @Column({ type: 'decimal', precision: 15, scale: 3 })
  quantity!: number;

  // ==================== Reference ====================

  @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
  referenceType?: string;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId?: string;

  // ==================== Batch/Serial ====================

  @Column({ name: 'batch_number', type: 'varchar', length: 100, nullable: true })
  batchNumber?: string;

  @Column({ name: 'serial_number', type: 'varchar', length: 100, nullable: true })
  serialNumber?: string;

  // ==================== Transaction Date ====================

  @Column({
    name: 'transaction_date',
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  transactionDate!: Date;

  // ==================== Notes ====================

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ==================== Audit Fields ====================

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;
}

import {
  WarehouseStatus,
  WarehouseType,
  type WarehouseCoordinates,
} from '@oneohm-epc/shared/types';
import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm';

import { InventoryStockEntity } from './inventory-stock.entity';
import { InventoryTransactionEntity } from './inventory-transaction.entity';
import { MaterialDispatchEntity } from './material-dispatch.entity';
import { PurchaseOrderEntity } from './purchase-order.entity';
import { StockAllocationEntity } from './stock-allocation.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Warehouse Entity
 * Represents storage locations for inventory
 */
@Entity('warehouses')
@Unique(['organizationId', 'code'])
@Index(['organizationId', 'deletedAt'])
@Index(['warehouseType', 'deletedAt'])
@Index(['warehouseManagerId'])
export class WarehouseEntity extends BaseEntity {
  // ==================== Relations ====================

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'warehouse_manager_id' })
  warehouseManager?: UserEntity;

  @OneToMany(() => InventoryStockEntity, (stock) => stock.warehouse)
  inventoryStock!: InventoryStockEntity[];

  @OneToMany(() => PurchaseOrderEntity, (po) => po.warehouse)
  purchaseOrders!: PurchaseOrderEntity[];

  @OneToMany(() => InventoryTransactionEntity, (txn) => txn.warehouse)
  transactions!: InventoryTransactionEntity[];

  @OneToMany(() => StockAllocationEntity, (allocation) => allocation.warehouse)
  stockAllocations!: StockAllocationEntity[];

  @OneToMany(() => MaterialDispatchEntity, (dispatch) => dispatch.warehouse)
  materialDispatches!: MaterialDispatchEntity[];

  @OneToMany(() => InventoryTransactionEntity, (txn) => txn.fromWarehouse)
  outgoingTransfers!: InventoryTransactionEntity[];

  @OneToMany(() => InventoryTransactionEntity, (txn) => txn.toWarehouse)
  incomingTransfers!: InventoryTransactionEntity[];

  // ==================== Foreign Keys ====================

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'warehouse_manager_id', type: 'uuid', nullable: true })
  warehouseManagerId?: string;

  // ==================== Main Fields ====================

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  // ==================== Location ====================

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state?: string;

  @Column({ type: 'varchar', length: 100, default: 'India' })
  country!: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  pincode?: string;

  @Column({ type: 'jsonb', nullable: true })
  coordinates?: WarehouseCoordinates;

  // ==================== Type ====================

  @Column({
    name: 'warehouse_type',
    type: 'enum',
    enum: WarehouseType,
    default: WarehouseType.OWN,
  })
  warehouseType!: WarehouseType;

  // ==================== Contact ====================

  @Column({ name: 'contact_person', type: 'varchar', length: 255, nullable: true })
  contactPerson?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  // ==================== Status ====================

  @Column({
    type: 'enum',
    enum: WarehouseStatus,
    default: WarehouseStatus.ACTIVE,
  })
  status!: WarehouseStatus;

  // ==================== Audit Fields ====================

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp with time zone', nullable: true })
  deletedAt?: Date;
}

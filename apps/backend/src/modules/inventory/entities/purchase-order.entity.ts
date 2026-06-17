import { PaymentStatus, PurchaseOrderStatus, PurchaseOrderType } from '@tejas96/shared/types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { PurchaseOrderItemEntity } from './purchase-order-item.entity';
import { VendorEntity } from './vendor.entity';
import { WarehouseEntity } from './warehouse.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Purchase Order Entity
 * Represents procurement orders from vendors
 */
@Entity('purchase_orders')
@Index(['organizationId', 'deletedAt'])
@Index(['vendorId'])
@Index(['warehouseId'])
@Index(['projectId'])
@Index(['status', 'deletedAt'])
export class PurchaseOrderEntity extends BaseEntity {
  // ==================== Relations ====================

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

  @ManyToOne(() => VendorEntity, (vendor) => vendor.purchaseOrders)
  @JoinColumn({ name: 'vendor_id' })
  vendor!: VendorEntity;

  @ManyToOne(() => WarehouseEntity, (warehouse) => warehouse.purchaseOrders, { nullable: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse?: WarehouseEntity;

  @ManyToOne(() => ProjectEntity, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project?: ProjectEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;

  @OneToMany(() => PurchaseOrderItemEntity, (item) => item.purchaseOrder, { cascade: true })
  items!: PurchaseOrderItemEntity[];

  // ==================== Foreign Keys ====================

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Column({ name: 'warehouse_id', type: 'uuid', nullable: true })
  warehouseId?: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId?: string;

  // ==================== PO Info ====================

  @Column({ name: 'po_number', type: 'varchar', length: 50, unique: true })
  poNumber!: string;

  @Column({ name: 'po_date', type: 'date', default: () => 'CURRENT_DATE' })
  poDate!: Date;

  // ==================== PO Type ====================

  @Column({
    name: 'po_type',
    type: 'enum',
    enum: PurchaseOrderType,
    default: PurchaseOrderType.STOCK,
  })
  poType!: PurchaseOrderType;

  // ==================== Delivery ====================

  @Column({ name: 'expected_delivery_date', type: 'date', nullable: true })
  expectedDeliveryDate?: Date;

  @Column({ name: 'actual_delivery_date', type: 'date', nullable: true })
  actualDeliveryDate?: Date;

  // ==================== Financial ====================

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  subtotal!: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  taxAmount!: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 15, scale: 2 })
  totalAmount!: number;

  // ==================== Payment ====================

  @Column({ name: 'payment_terms', type: 'text', nullable: true })
  paymentTerms?: string;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus!: PaymentStatus;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  paidAmount!: number;

  // ==================== Approval ====================

  @Column({ name: 'approval_request_id', type: 'uuid', nullable: true })
  approvalRequestId?: string;

  // ==================== Status ====================

  @Column({
    type: 'enum',
    enum: PurchaseOrderStatus,
    default: PurchaseOrderStatus.DRAFT,
  })
  status!: PurchaseOrderStatus;

  // ==================== Notes ====================

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'terms_conditions', type: 'text', nullable: true })
  termsConditions?: string;

  // ==================== Audit Fields ====================

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp with time zone', nullable: true })
  deletedAt?: Date;
}

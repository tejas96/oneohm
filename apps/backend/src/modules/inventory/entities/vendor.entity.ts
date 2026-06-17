import { VendorStatus, VendorType } from '@tejas96/shared/types';
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

import { ProjectVendorEntity } from './project-vendor.entity';
import { PurchaseOrderEntity } from './purchase-order.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';

/**
 * Vendor Entity
 * Represents suppliers, contractors, and service providers
 */
@Entity('vendors')
@Unique(['organizationId', 'code'])
@Index(['organizationId', 'deletedAt'])
@Index(['vendorType', 'deletedAt'])
@Index(['status', 'deletedAt'])
export class VendorEntity extends BaseEntity {
  // ==================== Relations ====================

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

  @OneToMany(() => PurchaseOrderEntity, (po) => po.vendor)
  purchaseOrders!: PurchaseOrderEntity[];

  @OneToMany(() => ProjectVendorEntity, (pv) => pv.vendor)
  projectVendors!: ProjectVendorEntity[];

  // ==================== Foreign Keys ====================

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  // ==================== Main Fields ====================

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  // ==================== Vendor Type ====================

  @Column({
    name: 'vendor_type',
    type: 'enum',
    enum: VendorType,
    default: VendorType.SUPPLIER,
  })
  vendorType!: VendorType;

  // ==================== Contact ====================

  @Column({ name: 'contact_person', type: 'varchar', length: 255, nullable: true })
  contactPerson?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ name: 'alternate_phone', type: 'varchar', length: 20, nullable: true })
  alternatePhone?: string;

  // ==================== Address ====================

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

  // ==================== Tax Details ====================

  @Column({ type: 'varchar', length: 15, nullable: true })
  gstin?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  pan?: string;

  // ==================== Payment Terms ====================

  @Column({ name: 'payment_terms', type: 'text', nullable: true })
  paymentTerms?: string;

  @Column({ name: 'credit_days', type: 'integer', nullable: true })
  creditDays?: number;

  // ==================== Bank Details ====================

  @Column({ name: 'bank_name', type: 'varchar', length: 255, nullable: true })
  bankName?: string;

  @Column({ name: 'account_number', type: 'varchar', length: 50, nullable: true })
  accountNumber?: string;

  @Column({ name: 'ifsc_code', type: 'varchar', length: 20, nullable: true })
  ifscCode?: string;

  // ==================== Status ====================

  @Column({
    type: 'enum',
    enum: VendorStatus,
    default: VendorStatus.ACTIVE,
  })
  status!: VendorStatus;

  // ==================== Rating ====================

  @Column({ type: 'decimal', precision: 2, scale: 1, nullable: true })
  rating?: number;

  // ==================== Notes ====================

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ==================== Audit Fields ====================

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp with time zone', nullable: true })
  deletedAt?: Date;
}

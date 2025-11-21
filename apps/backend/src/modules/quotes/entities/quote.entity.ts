import { ProjectType, QuoteStatus, SystemType } from '@oneohm-epc/shared-types';
import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { QuoteVersionEntity } from './quote-version.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CustomerProfileEntity } from '../../customers/entities/customer-profile.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { ResellerProfileEntity } from '../../resellers/entities/reseller-profile.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Quote Entity
 * Main quote/quotation record with version tracking
 */
@Entity('quotes')
export class QuoteEntity extends BaseEntity {
  // ==================== Relations ====================
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

  @Column({ type: 'uuid', name: 'customer_id' })
  customerId!: string;

  @ManyToOne(() => CustomerProfileEntity)
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerProfileEntity;

  @Column({ type: 'uuid', name: 'sales_person_id', nullable: true })
  salesPersonId?: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'sales_person_id' })
  salesPerson?: UserEntity;

  @Column({ type: 'uuid', name: 'reseller_id', nullable: true })
  resellerId?: string;

  @ManyToOne(() => ResellerProfileEntity, { nullable: true })
  @JoinColumn({ name: 'reseller_id' })
  reseller?: ResellerProfileEntity;

  // ==================== Quote Info ====================
  @Column({ type: 'varchar', length: 50, unique: true, name: 'quote_number' })
  quoteNumber!: string;

  @Column({ type: 'date', name: 'quote_date', default: () => 'CURRENT_DATE' })
  quoteDate!: Date;

  @Column({ type: 'date', name: 'valid_until' })
  validUntil!: Date;

  // ==================== Version Control ====================
  @Column({ type: 'integer', name: 'current_version', default: 1 })
  currentVersion!: number;

  @OneToMany(() => QuoteVersionEntity, (version) => version.quote, { cascade: true })
  versions!: QuoteVersionEntity[];

  // ==================== System Details ====================
  @Column({
    type: 'varchar',
    length: 50,
    name: 'system_type',
    enum: SystemType,
  })
  systemType!: SystemType;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'system_size_kw' })
  systemSizeKw!: number;

  @Column({ type: 'integer', name: 'total_wattage_wp' })
  totalWattageWp!: number;

  // ==================== Project Type ====================
  @Column({
    type: 'varchar',
    length: 50,
    name: 'project_type',
    enum: ProjectType,
  })
  projectType!: ProjectType;

  // ==================== Pricing Summary ====================
  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'base_price', nullable: true })
  basePrice?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'gst_amount', nullable: true })
  gstAmount?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'total_price', nullable: true })
  totalPrice?: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'discount_amount',
    default: 0,
  })
  discountAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'final_price', nullable: true })
  finalPrice?: number;

  // ==================== Subsidy ====================
  @Column({ type: 'boolean', name: 'is_subsidy_applicable', default: false })
  isSubsidyApplicable!: boolean;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'subsidy_amount',
    default: 0,
  })
  subsidyAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'effective_price', nullable: true })
  effectivePrice?: number;

  // ==================== Status ====================
  @Column({
    type: 'varchar',
    length: 20,
    default: QuoteStatus.DRAFT,
    enum: QuoteStatus,
  })
  status!: QuoteStatus;

  // ==================== Acceptance/Rejection ====================
  @Column({ type: 'timestamp with time zone', name: 'accepted_at', nullable: true })
  acceptedAt?: Date;

  @Column({ type: 'text', name: 'accepted_by_customer_signature', nullable: true })
  acceptedByCustomerSignature?: string;

  @Column({ type: 'text', name: 'rejection_reason', nullable: true })
  rejectionReason?: string;

  // ==================== Notes ====================
  @Column({ type: 'text', name: 'internal_notes', nullable: true })
  internalNotes?: string;

  @Column({ type: 'text', name: 'customer_notes', nullable: true })
  customerNotes?: string;

  // ==================== Audit ====================
  @DeleteDateColumn({ type: 'timestamp with time zone', name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity;

  @Column({ type: 'uuid', name: 'updated_by', nullable: true })
  updatedBy?: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;
}

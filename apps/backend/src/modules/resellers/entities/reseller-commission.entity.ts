import { CommissionStatus } from '@oneohm-epc/shared/types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { ResellerProfileEntity } from './reseller-profile.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Reseller Commission Entity
 * Tracks commission calculations and payments for resellers
 */
@Entity('reseller_commissions')
@Index(['organizationId', 'resellerId', 'status'])
@Index(['status'])
export class ResellerCommissionEntity extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'reseller_id', type: 'uuid' })
  resellerId!: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId?: string;

  // ==================== Commission Calculation ====================
  @Column({ name: 'project_value', type: 'decimal', precision: 15, scale: 2 })
  projectValue!: number;

  @Column({ name: 'commission_percentage', type: 'decimal', precision: 5, scale: 2 })
  commissionPercentage!: number;

  @Column({ name: 'commission_amount', type: 'decimal', precision: 15, scale: 2 })
  commissionAmount!: number;

  // ==================== Payment Status ====================
  @Column({
    type: 'varchar',
    length: 50,
    default: CommissionStatus.PENDING,
  })
  status!: CommissionStatus;

  // ==================== Approval ====================
  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy?: string;

  // ==================== Payment Details ====================
  @Column({ name: 'paid_at', type: 'date', nullable: true })
  paidAt?: Date;

  @Column({ name: 'paid_by', type: 'uuid', nullable: true })
  paidBy?: string;

  @Column({ name: 'payment_mode', type: 'varchar', length: 50, nullable: true })
  paymentMode?: string;

  @Column({ name: 'payment_reference', type: 'varchar', length: 100, nullable: true })
  paymentReference?: string;

  // ==================== Invoice ====================
  @Column({ name: 'invoice_number', type: 'varchar', length: 50, nullable: true })
  invoiceNumber?: string;

  @Column({ name: 'invoice_date', type: 'date', nullable: true })
  invoiceDate?: Date;

  @Column({ name: 'invoice_file_path', type: 'text', nullable: true })
  invoiceFilePath?: string;

  // ==================== Notes ====================
  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ==================== Audit Fields ====================
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  // ==================== Relationships ====================
  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;

  @ManyToOne(() => ResellerProfileEntity)
  @JoinColumn({ name: 'reseller_id' })
  reseller?: ResellerProfileEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'approved_by' })
  approver?: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'paid_by' })
  payer?: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;
}

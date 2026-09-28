import { CommissionStatus } from '@tejas96/shared/types';
import type { CommissionBaseSource, CommissionRateSource } from '@tejas96/shared/utils';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../../common/entities/base.entity';
import { UserEntity } from '../../../users/entities/user.entity';
import { EmployeeProfileEntity } from '../../entities/employee-profile.entity';

const money = {
  to: (v?: number | null) => v,
  from: (v?: string | null) => (v === null || v === undefined ? null : Number(v)),
};

/**
 * Employee Commission Entity
 * Tracks commission calculations and payments for employee_profiles rows
 * (reseller-kind profiles). Renamed from ResellerCommissionEntity /
 * reseller_commissions as part of the reseller module merge into employees.
 */
@Entity('employee_commissions')
@Index(['employeeId', 'status'])
@Index(['status'])
@Index(['quoteId'], { unique: true })
export class EmployeeCommissionEntity extends BaseEntity {
  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId!: string;

  @Column({ name: 'quote_id', type: 'uuid' })
  quoteId!: string;

  // ==================== Commission Calculation ====================
  @Column({ name: 'base_amount', type: 'decimal', precision: 15, scale: 2, transformer: money })
  baseAmount!: number;

  @Column({ name: 'base_source', type: 'varchar', length: 20 })
  baseSource!: CommissionBaseSource;

  @Column({ name: 'rate_source', type: 'varchar', length: 20 })
  rateSource!: CommissionRateSource;

  @Column({
    name: 'commission_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    transformer: money,
  })
  commissionPercentage!: number;

  @Column({
    name: 'commission_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: money,
  })
  commissionAmount!: number;

  // ==================== Payment Status ====================
  @Column({
    type: 'varchar',
    length: 50,
    default: CommissionStatus.PENDING,
  })
  status!: CommissionStatus;

  @Column({ name: 'payout_request_id', type: 'uuid', nullable: true })
  payoutRequestId?: string | null;

  @Column({ name: 'payout_rejected_reason', type: 'text', nullable: true })
  payoutRejectedReason?: string | null;

  @Column({ name: 'expense_entry_id', type: 'uuid', nullable: true })
  expenseEntryId?: string | null;

  @Column({
    name: 'recovered_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    transformer: money,
  })
  recoveredAmount?: number | null;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason?: string | null;

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

  // ==================== Recovery ====================
  @Column({ name: 'recovered_at', type: 'timestamptz', nullable: true })
  recoveredAt?: Date;

  @Column({ name: 'recovery_notes', type: 'text', nullable: true })
  recoveryNotes?: string;

  // ==================== Audit Fields ====================
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  // ==================== Relationships ====================

  @ManyToOne(() => EmployeeProfileEntity)
  @JoinColumn({ name: 'employee_id' })
  employee?: EmployeeProfileEntity;

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

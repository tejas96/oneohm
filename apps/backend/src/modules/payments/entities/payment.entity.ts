// ============================================
// IMPORTS
// ============================================
import { PaymentMethod, PaymentTransactionStatus } from '@tejas96/shared/types';
import { Entity, Column, ManyToOne, JoinColumn, Index, DeleteDateColumn } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { CustomerProfileEntity } from '../../customers/entities/customer-profile.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * PaymentEntity
 * Tracks payments for projects
 */
@Entity('payments')
@Index(['deletedAt'])
@Index(['projectId', 'deletedAt'])
@Index(['customerId'])
@Index(['status', 'deletedAt'])
export class PaymentEntity extends BaseEntity {
  // ============================================
  // RELATIONS (Many-to-One)
  // ============================================

  @ManyToOne(() => ProjectEntity)
  @JoinColumn({ name: 'project_id' })
  project?: ProjectEntity;

  @ManyToOne(() => CustomerProfileEntity)
  @JoinColumn({ name: 'customer_id' })
  customer?: CustomerProfileEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'reconciled_by' })
  reconciledByUser?: UserEntity;

  // ============================================
  // FOREIGN KEYS
  // ============================================

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  /**
   * Optional link to the planned receivable installment this receipt
   * fulfills. Null for advance / unallocated receipts. Backed by FK
   * `fk_payments_payment_term` (ON DELETE RESTRICT) added in migration
   * 1830000000001 — terms with linked receipts cannot be deleted.
   */
  @Column({ name: 'payment_term_id', type: 'uuid', nullable: true })
  paymentTermId?: string | null;

  // ============================================
  // PAYMENT INFO
  // ============================================
  @Column({ name: 'payment_number', type: 'varchar', length: 50 })
  paymentNumber!: string;

  // ============================================
  // AMOUNT
  // ============================================
  @Column({ name: 'expected_amount', type: 'decimal', precision: 15, scale: 2 })
  expectedAmount!: number;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 15, scale: 2 })
  paidAmount!: number;

  // ============================================
  // VALUE DATE
  // ============================================
  /**
   * The date the money actually moved, in IST. Distinct from `createdAt`, which
   * is when the row was entered. Restored by migration 1850800000000 after
   * `payment_date` was dropped by 1787000000000.
   */
  @Column({ name: 'paid_at', type: 'date' })
  paidAt!: string;

  /**
   * True for rows backfilled from `created_at` because their true value date is
   * unrecoverable. Never set on receipts recorded through the API.
   */
  @Column({ name: 'paid_at_is_inferred', type: 'boolean', default: false })
  paidAtIsInferred!: boolean;

  // ============================================
  // PAYMENT METHOD
  // ============================================
  @Column({ name: 'payment_method', type: 'varchar', length: 50 })
  paymentMethod!: PaymentMethod;

  @Column({ name: 'payment_reference', type: 'varchar', length: 255, nullable: true })
  paymentReference?: string;

  // ============================================
  // BANK DETAILS
  // ============================================
  @Column({ name: 'bank_name', type: 'varchar', length: 255, nullable: true })
  bankName?: string;

  @Column({ name: 'account_number', type: 'varchar', length: 50, nullable: true })
  accountNumber?: string;

  @Column({ name: 'ifsc_code', type: 'varchar', length: 20, nullable: true })
  ifscCode?: string;

  @Column({ name: 'transaction_id', type: 'varchar', length: 100, nullable: true })
  transactionId?: string;

  // ============================================
  // STATUS
  // ============================================
  @Column({
    name: 'status',
    type: 'varchar',
    length: 50,
    default: 'pending',
  })
  status!: PaymentTransactionStatus;

  // ============================================
  // RECONCILIATION
  // ============================================
  @Column({ name: 'reconciled_at', type: 'timestamptz', nullable: true })
  reconciledAt?: Date;

  @Column({ name: 'reconciled_by', type: 'uuid', nullable: true })
  reconciledBy?: string;

  // ============================================
  // NOTES
  // ============================================
  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ============================================
  // AUDIT FIELDS (Soft Delete)
  // ============================================
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;
}

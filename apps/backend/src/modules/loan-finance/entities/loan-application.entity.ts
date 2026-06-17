import { LoanStatus } from '@tejas96/shared/types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { CustomerProfileEntity } from '../../customers/entities/customer-profile.entity';
import { CustomerPropertyEntity } from '../../customers/entities/customer-property.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Loan Application Entity
 * Simplified for tracking customer loan interest with external banks.
 * We don't provide loans - customers get them from banks.
 * This entity tracks the loan reference and status for sales team follow-up.
 *
 * Note: Documents are now stored in CustomerPropertyEntity.documents JSONB column.
 * Use property.documents.filter(d => d.isLoanDoc) to get loan documents.
 */
@Entity('loan_applications')
@Index(['propertyId'], { where: 'deleted_at IS NULL' })
@Index(['customerId'], { where: 'deleted_at IS NULL' })
@Index(['status'], { where: 'deleted_at IS NULL' })
export class LoanApplicationEntity extends BaseEntity {
  // ============================================
  // RELATIONS
  // ============================================

  @ManyToOne(() => CustomerPropertyEntity)
  @JoinColumn({ name: 'property_id' })
  property?: CustomerPropertyEntity;

  @Column({ name: 'property_id', type: 'uuid', nullable: true })
  propertyId?: string | null;

  @ManyToOne(() => CustomerProfileEntity)
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerProfileEntity;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  // ============================================
  // BANK REFERENCE (entered by finance team after customer applies)
  // ============================================

  @Column({ name: 'bank_reference_number', type: 'varchar', length: 50, nullable: true })
  bankReferenceNumber?: string | null;

  // ============================================
  // LENDER INFO
  // ============================================

  @Column({ name: 'lender_name', type: 'varchar', length: 255, nullable: true })
  lenderName?: string | null;

  @Column({ name: 'lender_contact', type: 'varchar', length: 255, nullable: true })
  lenderContact?: string | null;

  @Column({ name: 'loan_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  loanAmount?: number | null;

  // ============================================
  // STATUS
  // ============================================

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'initiated' })
  status: LoanStatus;

  // ============================================
  // NOTES
  // ============================================

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  // ============================================
  // SOFT DELETE
  // ============================================

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt?: Date | null;

  // ============================================
  // AUDIT
  // ============================================

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser?: UserEntity;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser?: UserEntity;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string | null;
}

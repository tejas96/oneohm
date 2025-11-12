import { LoanDocumentType } from '@oneohm-epc/shared-types';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { LoanApplicationEntity } from './loan-application.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Loan Document Entity
 * Schema: Lines 1850-1867
 */
@Entity('loan_documents')
@Index(['loanApplicationId'])
@Index(['documentType'])
@Index(['isVerified'])
export class LoanDocumentEntity extends BaseEntity {
  // ============================================
  // RELATIONS
  // ============================================

  @ManyToOne(() => LoanApplicationEntity, (application) => application.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'loan_application_id' })
  loanApplication: LoanApplicationEntity;

  @Column({ name: 'loan_application_id', type: 'uuid' })
  loanApplicationId: string;

  // ============================================
  // DOCUMENT INFO
  // ============================================

  @Column({ name: 'document_type', type: 'varchar', length: 100 })
  documentType: LoanDocumentType;

  @Column({ name: 'document_name', type: 'varchar', length: 255 })
  documentName: string;

  @Column({ name: 'file_path', type: 'text' })
  filePath: string;

  // ============================================
  // VERIFICATION
  // ============================================

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'verified_by' })
  verifiedByUser: UserEntity;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string | null;

  // ============================================
  // AUDIT
  // ============================================

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: UserEntity;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;
}

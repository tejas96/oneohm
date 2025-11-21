// ============================================
// IMPORTS
// ============================================
import { DocumentStatus, DocumentType, WcrType } from '@oneohm-epc/shared-types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { CustomerProfileEntity } from '../../customers/entities/customer-profile.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { PaymentEntity } from '../../payments/entities/payment.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { QuoteEntity } from '../../quotes/entities/quote.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * DocumentEntity
 * Universal document management with version control, digital signatures, and OTP verification
 * Schema Reference: Lines 1482-1555
 */
@Entity('documents')
@Index(['organizationId', 'deletedAt'])
@Index(['documentType', 'deletedAt'])
@Index(['projectId', 'deletedAt'])
@Index(['customerId'])
@Index(['quoteId'])
@Index(['paymentId'])
@Index(['isLatestVersion'])
@Index(['wcrSessionNumber'])
export class DocumentEntity extends BaseEntity {
  // ============================================
  // RELATIONS
  // ============================================
  @ManyToOne(() => OrganizationEntity, { nullable: false })
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => ProjectEntity, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project?: ProjectEntity;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId?: string;

  @ManyToOne(() => CustomerProfileEntity, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: CustomerProfileEntity;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId?: string;

  @ManyToOne(() => QuoteEntity, { nullable: true })
  @JoinColumn({ name: 'quote_id' })
  quote?: QuoteEntity;

  @Column({ name: 'quote_id', type: 'uuid', nullable: true })
  quoteId?: string;

  @ManyToOne(() => PaymentEntity, { nullable: true })
  @JoinColumn({ name: 'payment_id' })
  payment?: PaymentEntity;

  @Column({ name: 'payment_id', type: 'uuid', nullable: true })
  paymentId?: string;

  @ManyToOne(() => DocumentEntity, { nullable: true })
  @JoinColumn({ name: 'parent_document_id' })
  parentDocument?: DocumentEntity;

  @Column({ name: 'parent_document_id', type: 'uuid', nullable: true })
  parentDocumentId?: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'signed_by' })
  signedByUser?: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser?: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser?: UserEntity;

  // ============================================
  // DOCUMENT INFO
  // ============================================
  @Column({ name: 'document_number', type: 'varchar', length: 50, unique: true })
  documentNumber!: string;

  @Column({ name: 'document_name', type: 'varchar', length: 255 })
  documentName!: string;

  @Column({ name: 'document_type', type: 'varchar', length: 50 })
  documentType!: DocumentType;

  // ============================================
  // FILE DETAILS
  // ============================================
  @Column({ name: 'file_path', type: 'text' })
  filePath!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes?: number;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType?: string;

  // ============================================
  // VERSION CONTROL
  // ============================================
  @Column({ type: 'integer', default: 1 })
  version!: number;

  @Column({ name: 'is_latest_version', type: 'boolean', default: true })
  isLatestVersion!: boolean;

  // ============================================
  // WCR SPECIFIC FIELDS
  // ============================================
  @Column({ name: 'wcr_session_number', type: 'varchar', length: 100, nullable: true })
  wcrSessionNumber?: string;

  @Column({ name: 'wcr_type', type: 'varchar', length: 20, nullable: true })
  wcrType?: WcrType;

  // ============================================
  // DIGITAL SIGNATURE
  // ============================================
  @Column({ name: 'is_signed', type: 'boolean', default: false })
  isSigned!: boolean;

  @Column({ name: 'signed_by', type: 'uuid', nullable: true })
  signedBy?: string;

  @Column({ name: 'signed_at', type: 'timestamptz', nullable: true })
  signedAt?: Date;

  @Column({ name: 'signature_data', type: 'text', nullable: true })
  signatureData?: string;

  // ============================================
  // OTP VERIFICATION
  // ============================================
  @Column({ name: 'is_otp_verified', type: 'boolean', default: false })
  isOtpVerified!: boolean;

  @Column({ name: 'otp_verified_at', type: 'timestamptz', nullable: true })
  otpVerifiedAt?: Date;

  // ============================================
  // STATUS
  // ============================================
  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status!: DocumentStatus;

  // ============================================
  // METADATA
  // ============================================
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  // ============================================
  // NOTES
  // ============================================
  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ============================================
  // AUDIT FIELDS
  // ============================================
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;
}

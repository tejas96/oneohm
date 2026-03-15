import { ComplianceStatus } from '@oneohm-epc/shared/types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Compliance Application Entity
 * Schema: Lines 1876-1922
 */
@Entity('compliance_applications')
@Index(['projectId'], { where: 'deleted_at IS NULL' })
@Index(['applicationType'])
@Index(['status'], { where: 'deleted_at IS NULL' })
export class ComplianceApplicationEntity extends BaseEntity {
  // ============================================
  // RELATIONS
  // ============================================

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  organization: OrganizationEntity;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => ProjectEntity)
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  // ============================================
  // APPLICATION INFO
  // ============================================

  @Column({ name: 'application_type', type: 'varchar', length: 100 })
  applicationType: string;

  @Column({ name: 'application_number', type: 'varchar', length: 50, unique: true })
  applicationNumber: string;

  @Column({ name: 'application_date', type: 'date' })
  applicationDate: Date;

  // ============================================
  // AUTHORITY DETAILS
  // ============================================

  @Column({ name: 'authority_name', type: 'varchar', length: 255, nullable: true })
  authorityName: string | null;

  @Column({ name: 'authority_reference_number', type: 'varchar', length: 100, nullable: true })
  authorityReferenceNumber: string | null;

  // ============================================
  // STATUS
  // ============================================

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'draft' })
  status: ComplianceStatus;

  // ============================================
  // SUBMISSION
  // ============================================

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'submitted_by' })
  submittedByUser: UserEntity;

  @Column({ name: 'submitted_by', type: 'uuid', nullable: true })
  submittedBy: string | null;

  // ============================================
  // APPROVAL
  // ============================================

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'approval_document_path', type: 'text', nullable: true })
  approvalDocumentPath: string | null;

  // ============================================
  // REJECTION
  // ============================================

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'rejected_at', type: 'timestamptz', nullable: true })
  rejectedAt: Date | null;

  // ============================================
  // NOTES
  // ============================================

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // ============================================
  // SOFT DELETE
  // ============================================

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date | null;

  // ============================================
  // AUDIT
  // ============================================

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: UserEntity;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: UserEntity;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;
}

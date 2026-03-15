import { SubsidyStatus } from '@oneohm-epc/shared/types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { CustomerProfileEntity } from '../../customers/entities/customer-profile.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Subsidy Application Entity
 * Schema: Lines 1977-2028
 */
@Entity('subsidy_applications')
@Index(['projectId'], { where: 'deleted_at IS NULL' })
@Index(['customerId'])
@Index(['status'], { where: 'deleted_at IS NULL' })
export class SubsidyApplicationEntity extends BaseEntity {
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

  @ManyToOne(() => CustomerProfileEntity)
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerProfileEntity;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  // ============================================
  // APPLICATION INFO
  // ============================================

  @Column({ name: 'application_number', type: 'varchar', length: 50, unique: true })
  applicationNumber: string;

  @Column({ name: 'application_date', type: 'date' })
  applicationDate: Date;

  // ============================================
  // SUBSIDY DETAILS
  // ============================================

  @Column({ name: 'subsidy_scheme', type: 'varchar', length: 255, nullable: true })
  subsidyScheme: string | null;

  @Column({ name: 'applied_amount', type: 'decimal', precision: 15, scale: 2 })
  appliedAmount: number;

  // ============================================
  // PORTAL DETAILS
  // ============================================

  @Column({ name: 'portal_name', type: 'varchar', length: 100, nullable: true })
  portalName: string | null;

  @Column({ name: 'portal_application_id', type: 'varchar', length: 100, nullable: true })
  portalApplicationId: string | null;

  // ============================================
  // STATUS
  // ============================================

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'initiated' })
  status: SubsidyStatus;

  // ============================================
  // APPROVAL
  // ============================================

  @Column({ name: 'approved_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  approvedAmount: number | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  // ============================================
  // DISBURSEMENT
  // ============================================

  @Column({ name: 'disbursement_date', type: 'date', nullable: true })
  disbursementDate: Date | null;

  @Column({ name: 'disbursement_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  disbursementAmount: number | null;

  @Column({ name: 'disbursement_mode', type: 'varchar', length: 50, nullable: true })
  disbursementMode: string | null;

  @Column({ name: 'disbursement_reference', type: 'varchar', length: 100, nullable: true })
  disbursementReference: string | null;

  // ============================================
  // REJECTION
  // ============================================

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

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

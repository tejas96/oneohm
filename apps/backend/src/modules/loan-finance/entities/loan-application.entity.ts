import { LoanStatus } from '@oneohm-epc/shared-types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { LoanDocumentEntity } from './loan-document.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CustomerProfileEntity } from '../../customers/entities/customer-profile.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Loan Application Entity
 * Schema: Lines 1783-1839
 */
@Entity('loan_applications')
@Index(['projectId'], { where: 'deleted_at IS NULL' })
@Index(['customerId'], { where: 'deleted_at IS NULL' })
@Index(['status'], { where: 'deleted_at IS NULL' })
@Index(['applicationNumber'], { unique: true })
@Index(['janSamarthApplicationId'], { where: 'jan_samarth_application_id IS NOT NULL' })
export class LoanApplicationEntity extends BaseEntity {
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

  @OneToMany(() => LoanDocumentEntity, (document) => document.loanApplication)
  documents: LoanDocumentEntity[];

  // ============================================
  // APPLICATION INFO
  // ============================================

  @Column({ name: 'application_number', type: 'varchar', length: 50, unique: true })
  applicationNumber: string;

  @Column({ name: 'application_date', type: 'date' })
  applicationDate: Date;

  // ============================================
  // LOAN DETAILS
  // ============================================

  @Column({ name: 'loan_amount', type: 'decimal', precision: 15, scale: 2 })
  loanAmount: number;

  @Column({ name: 'loan_tenure_months', type: 'integer' })
  loanTenureMonths: number;

  @Column({ name: 'interest_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  interestRate: number | null;

  // ============================================
  // LENDER
  // ============================================

  @Column({ name: 'lender_name', type: 'varchar', length: 255, nullable: true })
  lenderName: string | null;

  @Column({ name: 'lender_contact', type: 'varchar', length: 255, nullable: true })
  lenderContact: string | null;

  // ============================================
  // JAN SAMARTH PORTAL
  // ============================================

  @Column({ name: 'jan_samarth_application_id', type: 'varchar', length: 100, nullable: true })
  janSamarthApplicationId: string | null;

  @Column({ name: 'jan_samarth_submitted_at', type: 'timestamptz', nullable: true })
  janSamarthSubmittedAt: Date | null;

  // ============================================
  // STATUS
  // ============================================

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'initiated' })
  status: LoanStatus;

  // ============================================
  // SITE VISIT
  // ============================================

  @Column({ name: 'site_visit_scheduled_date', type: 'date', nullable: true })
  siteVisitScheduledDate: Date | null;

  @Column({ name: 'site_visit_completed_date', type: 'date', nullable: true })
  siteVisitCompletedDate: Date | null;

  @Column({ name: 'site_visit_report', type: 'text', nullable: true })
  siteVisitReport: string | null;

  // ============================================
  // APPROVAL
  // ============================================

  @Column({ name: 'approved_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  approvedAmount: number | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'approved_by_lender', type: 'varchar', length: 255, nullable: true })
  approvedByLender: string | null;

  // ============================================
  // DISBURSEMENT
  // ============================================

  @Column({ name: 'disbursement_date', type: 'date', nullable: true })
  disbursementDate: Date | null;

  @Column({ name: 'disbursement_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  disbursementAmount: number | null;

  @Column({ name: 'disbursement_reference', type: 'varchar', length: 100, nullable: true })
  disbursementReference: string | null;

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

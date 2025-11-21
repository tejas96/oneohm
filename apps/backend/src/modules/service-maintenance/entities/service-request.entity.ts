import { ServiceRequestPriority, ServiceRequestStatus } from '@oneohm-epc/shared-types';
import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne } from 'typeorm';


import { BaseEntity } from '../../../common/entities/base.entity';
import { CustomerProfileEntity } from '../../customers/entities/customer-profile.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Service Request Entity
 * Schema: Lines 1658-1721
 */
@Entity('service_requests')
export class ServiceRequestEntity extends BaseEntity {
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
  // REQUEST INFO
  // ============================================

  @Column({ name: 'request_number', type: 'varchar', length: 50, unique: true })
  requestNumber: string;

  @Column({ name: 'request_date', type: 'date' })
  requestDate: Date;

  // ============================================
  // ISSUE DETAILS
  // ============================================

  @Column({ name: 'issue_title', type: 'varchar', length: 255 })
  issueTitle: string;

  @Column({ name: 'issue_description', type: 'text' })
  issueDescription: string;

  @Column({ name: 'issue_category', type: 'varchar', length: 100, nullable: true })
  issueCategory: string | null;

  // ============================================
  // PRIORITY
  // ============================================

  @Column({
    type: 'varchar',
    length: 20,
    default: ServiceRequestPriority.MEDIUM,
  })
  priority: ServiceRequestPriority;

  // ============================================
  // ASSIGNMENT
  // ============================================

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'assigned_to_user_id' })
  assignedToUser: UserEntity;

  @Column({ name: 'assigned_to_user_id', type: 'uuid', nullable: true })
  assignedToUserId: string | null;

  @Column({ name: 'assigned_at', type: 'timestamptz', nullable: true })
  assignedAt: Date | null;

  // ============================================
  // SCHEDULE
  // ============================================

  @Column({ name: 'scheduled_date', type: 'date', nullable: true })
  scheduledDate: Date | null;

  @Column({ name: 'completed_date', type: 'date', nullable: true })
  completedDate: Date | null;

  // ============================================
  // STATUS
  // ============================================

  @Column({
    type: 'varchar',
    length: 50,
    default: ServiceRequestStatus.OPEN,
  })
  status: ServiceRequestStatus;

  // ============================================
  // CHARGEABLE
  // ============================================

  @Column({ name: 'is_chargeable', type: 'boolean', default: false })
  isChargeable: boolean;

  @Column({ name: 'estimated_cost', type: 'decimal', precision: 15, scale: 2, nullable: true })
  estimatedCost: number | null;

  @Column({ name: 'actual_cost', type: 'decimal', precision: 15, scale: 2, nullable: true })
  actualCost: number | null;

  // ============================================
  // RESOLUTION
  // ============================================

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string | null;

  /**
   * Resolution Attachments (JSONB)
   * Example: [
   *   { fileName: "resolved.jpg", filePath: "/uploads/resolved.jpg" }
   * ]
   */
  @Column({ name: 'resolution_attachments', type: 'jsonb', nullable: true })
  resolutionAttachments: Array<{
    fileName: string;
    filePath: string;
    fileSize?: number;
    mimeType?: string;
  }> | null;

  // ============================================
  // CUSTOMER FEEDBACK
  // ============================================

  @Column({ name: 'customer_rating', type: 'integer', nullable: true })
  customerRating: number | null;

  @Column({ name: 'customer_feedback', type: 'text', nullable: true })
  customerFeedback: string | null;

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


import { ApprovalRequestPriority, ApprovalRequestStatus } from '@oneohm-epc/shared/types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ApprovalHistoryEntity } from './approval-history.entity';
import { ApprovalStageEntity } from './approval-stage.entity';
import { ApprovalTemplateEntity } from './approval-template.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * ApprovalRequestEntity
 * Represents active approval workflow instances
 */
@Entity('approval_requests')
@Index(['organizationId'])
@Index(['templateId'])
@Index(['referenceType', 'referenceId'])
@Index(['status'])
@Index(['requestedBy'])
@Index(['currentStageId'])
export class ApprovalRequestEntity {
  // ==================== Primary Key ====================

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== Relations ====================

  @ManyToOne(() => ApprovalTemplateEntity, (template) => template.requests)
  @JoinColumn({ name: 'template_id' })
  template!: ApprovalTemplateEntity;

  @ManyToOne(() => ApprovalStageEntity)
  @JoinColumn({ name: 'current_stage_id' })
  currentStage?: ApprovalStageEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'requested_by' })
  requestedByUser!: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'final_approved_by' })
  finalApprovedByUser?: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'final_rejected_by' })
  finalRejectedByUser?: UserEntity;

  @OneToMany(() => ApprovalHistoryEntity, (history) => history.approvalRequest, {
    cascade: true,
  })
  history!: ApprovalHistoryEntity[];

  // ==================== Foreign Keys ====================

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId!: string;

  @Column({ name: 'current_stage_id', type: 'uuid', nullable: true })
  currentStageId?: string;

  @Column({ name: 'requested_by', type: 'uuid' })
  requestedBy!: string;

  @Column({ name: 'final_approved_by', type: 'uuid', nullable: true })
  finalApprovedBy?: string;

  @Column({ name: 'final_rejected_by', type: 'uuid', nullable: true })
  finalRejectedBy?: string;

  // ==================== Reference Info ====================

  @Column({ name: 'reference_type', type: 'varchar', length: 50 })
  referenceType!: string;

  @Column({ name: 'reference_id', type: 'uuid' })
  referenceId!: string;

  // ==================== Request Info ====================

  @Column({ name: 'request_number', type: 'varchar', length: 50, unique: true })
  requestNumber!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  amount?: number;

  // ==================== Current Stage Info ====================

  @Column({
    name: 'current_stage_order',
    type: 'integer',
    default: 1,
  })
  currentStageOrder!: number;

  // ==================== Status ====================

  @Column({
    type: 'enum',
    enum: ApprovalRequestStatus,
    default: ApprovalRequestStatus.PENDING,
  })
  status!: ApprovalRequestStatus;

  @Column({
    type: 'enum',
    enum: ApprovalRequestPriority,
    default: ApprovalRequestPriority.NORMAL,
  })
  priority!: ApprovalRequestPriority;

  // ==================== Timestamps ====================

  @Column({
    name: 'submitted_at',
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  submittedAt!: Date;

  @Column({
    name: 'completed_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  completedAt?: Date;

  @Column({
    name: 'expires_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  expiresAt?: Date;

  // ==================== Final Result ====================

  @Column({
    name: 'final_status',
    type: 'enum',
    enum: ApprovalRequestStatus,
    nullable: true,
  })
  finalStatus?: ApprovalRequestStatus;

  @Column({ name: 'final_comment', type: 'text', nullable: true })
  finalComment?: string;

  // ==================== Metadata ====================

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  // ==================== Audit ====================

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
  })
  updatedAt!: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;
}

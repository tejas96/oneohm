import { ApprovalRequirementType, ApproverType, AutoActionOnTimeout } from '@tejas96/shared/types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ApprovalTemplateEntity } from './approval-template.entity';

/**
 * ApprovalStageEntity
 * Represents individual stages within an approval workflow template
 */
@Entity('approval_stages')
@Index(['templateId'])
@Index(['templateId', 'stageOrder'])
export class ApprovalStageEntity {
  // ==================== Primary Key ====================

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== Relations ====================

  @ManyToOne(() => ApprovalTemplateEntity, (template) => template.stages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template!: ApprovalTemplateEntity;

  // ==================== Foreign Keys ====================

  @Column({ name: 'template_id', type: 'uuid' })
  templateId!: string;

  // ==================== Stage Info ====================

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'stage_order', type: 'integer' })
  stageOrder!: number;

  // ==================== Approver Configuration ====================

  @Column({
    name: 'approver_type',
    type: 'enum',
    enum: ApproverType,
  })
  approverType!: ApproverType;

  @Column({
    name: 'approver_roles',
    type: 'varchar',
    array: true,
    nullable: true,
  })
  approverRoles?: string[];

  @Column({
    name: 'approver_user_ids',
    type: 'uuid',
    array: true,
    nullable: true,
  })
  approverUserIds?: string[];

  @Column({
    name: 'dynamic_approver_rules',
    type: 'jsonb',
    nullable: true,
  })
  dynamicApproverRules?: Record<string, unknown>;

  // ==================== Approval Requirements ====================

  @Column({
    name: 'approval_requirement_type',
    type: 'enum',
    enum: ApprovalRequirementType,
    default: ApprovalRequirementType.ANY,
  })
  approvalRequirementType!: ApprovalRequirementType;

  @Column({
    name: 'required_approvals_count',
    type: 'integer',
    default: 1,
  })
  requiredApprovalsCount!: number;

  // ==================== Stage Behavior ====================

  @Column({
    name: 'is_mandatory',
    type: 'boolean',
    default: true,
  })
  isMandatory!: boolean;

  @Column({
    name: 'can_skip',
    type: 'boolean',
    default: false,
  })
  canSkip!: boolean;

  @Column({
    name: 'skip_conditions',
    type: 'jsonb',
    nullable: true,
  })
  skipConditions?: Record<string, unknown>;

  @Column({
    name: 'allow_parallel_approval',
    type: 'boolean',
    default: false,
  })
  allowParallelApproval!: boolean;

  // ==================== Timeout ====================

  @Column({
    name: 'timeout_hours',
    type: 'integer',
    nullable: true,
  })
  timeoutHours?: number;

  @Column({
    name: 'auto_action_on_timeout',
    type: 'enum',
    enum: AutoActionOnTimeout,
    nullable: true,
  })
  autoActionOnTimeout?: AutoActionOnTimeout;

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

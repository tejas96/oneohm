import { ApprovalWorkflowType } from '@tejas96/shared/types';
import { Column, DeleteDateColumn, Entity, Index, OneToMany } from 'typeorm';

import { ApprovalRequestEntity } from './approval-request.entity';
import { ApprovalStageEntity } from './approval-stage.entity';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * ApprovalTemplateEntity
 * Represents reusable approval workflow templates
 */
@Entity('approval_templates')
@Index(['organizationId', 'deletedAt'])
@Index(['workflowType', 'deletedAt'])
@Index(['isActive', 'deletedAt'])
export class ApprovalTemplateEntity extends BaseEntity {
  // ==================== Relations ====================

  @OneToMany(() => ApprovalStageEntity, (stage) => stage.template, {
    cascade: true,
  })
  stages!: ApprovalStageEntity[];

  @OneToMany(() => ApprovalRequestEntity, (request) => request.template)
  requests!: ApprovalRequestEntity[];

  // Note: Organization relation is implicit via organizationId

  // ==================== Foreign Keys ====================

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  // ==================== Template Info ====================

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    name: 'workflow_type',
    type: 'enum',
    enum: ApprovalWorkflowType,
  })
  workflowType!: ApprovalWorkflowType;

  // ==================== Trigger Conditions ====================

  @Column({
    name: 'trigger_conditions',
    type: 'jsonb',
    nullable: true,
  })
  triggerConditions?: Record<string, unknown>;

  // ==================== Auto-approval ====================

  @Column({
    name: 'auto_approval_enabled',
    type: 'boolean',
    default: false,
  })
  autoApprovalEnabled!: boolean;

  @Column({
    name: 'auto_approval_conditions',
    type: 'jsonb',
    nullable: true,
  })
  autoApprovalConditions?: Record<string, unknown>;

  // ==================== Escalation ====================

  @Column({
    name: 'escalation_enabled',
    type: 'boolean',
    default: false,
  })
  escalationEnabled!: boolean;

  @Column({
    name: 'escalation_hours',
    type: 'integer',
    nullable: true,
  })
  escalationHours?: number;

  // ==================== Notifications ====================

  @Column({
    name: 'notify_on_request',
    type: 'boolean',
    default: true,
  })
  notifyOnRequest!: boolean;

  @Column({
    name: 'notify_on_approval',
    type: 'boolean',
    default: true,
  })
  notifyOnApproval!: boolean;

  @Column({
    name: 'notify_on_rejection',
    type: 'boolean',
    default: true,
  })
  notifyOnRejection!: boolean;

  // ==================== Status ====================

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

  // ==================== Soft Delete ====================

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp with time zone' })
  deletedAt?: Date;

  // ==================== Audit Fields ====================

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;
}

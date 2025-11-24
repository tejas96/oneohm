import { ApprovalAction, ApprovalDecision } from '@oneohm-epc/shared-types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ApprovalRequestEntity } from './approval-request.entity';
import { ApprovalStageEntity } from './approval-stage.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * ApprovalHistoryEntity
 * Represents audit trail of approval actions
 */
@Entity('approval_history')
@Index(['approvalRequestId'])
@Index(['stageId'])
@Index(['actedBy'])
@Index(['action'])
@Index(['actedAt'])
export class ApprovalHistoryEntity {
  // ==================== Primary Key ====================

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== Relations ====================

  @ManyToOne(() => ApprovalRequestEntity, (request) => request.history, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'approval_request_id' })
  approvalRequest!: ApprovalRequestEntity;

  @ManyToOne(() => ApprovalStageEntity, { nullable: true })
  @JoinColumn({ name: 'stage_id' })
  stage?: ApprovalStageEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'acted_by' })
  actedByUser!: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'delegated_from' })
  delegatedFromUser?: UserEntity;

  // ==================== Foreign Keys ====================

  @Column({ name: 'approval_request_id', type: 'uuid' })
  approvalRequestId!: string;

  @Column({ name: 'stage_id', type: 'uuid', nullable: true })
  stageId?: string;

  @Column({ name: 'acted_by', type: 'uuid' })
  actedBy!: string;

  @Column({ name: 'delegated_from', type: 'uuid', nullable: true })
  delegatedFrom?: string;

  // ==================== Action Info ====================

  @Column({
    type: 'enum',
    enum: ApprovalAction,
  })
  action!: ApprovalAction;

  @Column({
    type: 'enum',
    enum: ApprovalDecision,
    nullable: true,
  })
  decision?: ApprovalDecision;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  // ==================== Actor Info ====================

  @Column({ name: 'acted_by_role', type: 'varchar', length: 50, nullable: true })
  actedByRole?: string;

  // ==================== Timestamps ====================

  @Column({
    name: 'acted_at',
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  actedAt!: Date;

  // ==================== Metadata ====================

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  // ==================== Audit ====================

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt!: Date;
}

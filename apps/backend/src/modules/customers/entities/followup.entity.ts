import {
  FollowupOutcome,
  FollowupPriority,
  FollowupStatus,
  FollowupType,
} from '@tejas96/shared/types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { CustomerProfileEntity } from './customer-profile.entity';
import { CustomerPropertyEntity } from './customer-property.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Followup Entity
 * Represents a scheduled follow-up activity for a customer or property
 * Can be attached to:
 * - Customer only (customer-level followup, propertyId is null)
 * - Customer + Property (property-level followup)
 */
@Entity('followups')
@Index(['status', 'deletedAt'])
@Index(['assignedToUserId', 'scheduledAt'], { where: 'deleted_at IS NULL' })
@Index(['customerId'], { where: 'deleted_at IS NULL' })
@Index(['propertyId'], { where: 'deleted_at IS NULL' })
@Index(['scheduledAt', 'status'], { where: 'deleted_at IS NULL' })
export class FollowupEntity extends BaseEntity {
  // ==================== CUSTOMER (Required) ====================
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => CustomerProfileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer?: CustomerProfileEntity;

  // ==================== PROPERTY (Optional - nullable for customer-level followups) ====================
  @Column({ name: 'property_id', type: 'uuid', nullable: true })
  propertyId?: string;

  @ManyToOne(() => CustomerPropertyEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'property_id' })
  property?: CustomerPropertyEntity;

  // ==================== FOLLOWUP DETAILS ====================
  @Column({ type: 'varchar', length: 50 })
  type!: FollowupType;

  @Column({ type: 'varchar', length: 255 })
  subject!: string;

  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  scheduledAt!: Date;

  @Column({ name: 'assigned_to_user_id', type: 'uuid' })
  assignedToUserId!: string;

  @ManyToOne(() => UserEntity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'assigned_to_user_id' })
  assignedToUser?: UserEntity;

  @Column({ type: 'varchar', length: 20, default: FollowupStatus.PENDING })
  status!: FollowupStatus;

  @Column({ type: 'varchar', length: 20, default: FollowupPriority.NORMAL })
  priority!: FollowupPriority;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ==================== COMPLETION ====================
  /** What happened. Set when the followup is completed; null while pending. */
  @Column({ type: 'varchar', length: 30, nullable: true })
  outcome?: FollowupOutcome;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  // ==================== AUDIT FIELDS ====================
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @ManyToOne(() => UserEntity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  @ManyToOne(() => UserEntity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;
}

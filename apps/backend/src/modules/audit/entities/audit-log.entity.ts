import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { UserEntity } from '../../users/entities/user.entity';

/**
 * AuditLog Entity
 *
 * Tracks all changes to entities across the system for audit trail purposes.
 * Stores before/after snapshots, user info, and metadata.
 *
 * Schema: Lines 2039-2070
 */
@Entity('audit_logs')
@Index('idx_audit_logs_entity', ['entityType', 'entityId'])
@Index('idx_audit_logs_user', ['userId'])
@Index('idx_audit_logs_created', ['createdAt'])
@Index('idx_audit_logs_action', ['action'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;



  // ============================================
  // ENTITY INFO
  // ============================================

  @Column({ name: 'entity_type', type: 'varchar', length: 100 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  // ============================================
  // ACTION
  // ============================================

  @Column({ type: 'varchar', length: 50 })
  action: string;

  // ============================================
  // CHANGES
  // ============================================

  @Column({ name: 'old_values', type: 'jsonb', nullable: true })
  oldValues: Record<string, unknown> | null;

  @Column({ name: 'new_values', type: 'jsonb', nullable: true })
  newValues: Record<string, unknown> | null;

  // ============================================
  // USER INFO
  // ============================================

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  // ============================================
  // METADATA
  // ============================================

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  // ============================================
  // TIMESTAMP
  // ============================================

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}

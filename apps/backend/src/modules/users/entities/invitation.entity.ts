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

import { RoleEntity } from '../../iam/entities/role.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';

/**
 * Invitation Status
 */
export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

/**
 * Invitation Entity
 * Manages user invitation tokens for onboarding
 * Used when platform admin or org super admin invites users
 */
@Entity('invitations')
@Index(['email'])
@Index(['token'], { unique: true })
@Index(['organizationId'])
@Index(['status'])
@Index(['expiresAt'])
export class InvitationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== Invitation Details ====================

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  token!: string;

  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  status!: InvitationStatus;

  @Column({ name: 'expires_at', type: 'timestamp with time zone' })
  expiresAt!: Date;

  @Column({
    name: 'accepted_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  acceptedAt?: Date;

  // ==================== Relations ====================

  @ManyToOne(() => OrganizationEntity, { nullable: false })
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => RoleEntity, { nullable: false })
  @JoinColumn({ name: 'role_id' })
  role!: RoleEntity;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId!: string;

  // ==================== Audit ====================

  @Column({ name: 'invited_by', type: 'uuid', nullable: true })
  invitedBy?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}

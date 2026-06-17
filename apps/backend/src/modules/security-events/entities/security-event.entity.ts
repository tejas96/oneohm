import {
  SecurityEventType,
  SecurityEventCategory,
  SecurityEventSeverity,
  SecurityEventStatus,
} from '@tejas96/shared/types';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Security Event Entity
 * Generic table for tracking all security-related events in the system
 *
 * Use Cases:
 * - OTP tracking (sent, verified, failed)
 * - Login attempts (success/failed)
 * - Rate limiting enforcement
 * - Security analytics
 * - Compliance audit trail
 * - Suspicious activity detection
 */
@Entity('security_events')
@Index(['organizationId', 'eventType', 'createdAt'])
@Index(['userId', 'eventType', 'createdAt'])
@Index(['eventType', 'status', 'createdAt'])
@Index(['eventCategory', 'severity', 'createdAt'])
@Index(['ipAddress', 'eventType', 'createdAt'])
@Index(['expiresAt']) // For cleanup jobs
export class SecurityEventEntity extends BaseEntity {
  // ===== RELATIONSHIPS =====

  /**
   * Organization (nullable for system-level events)
   */
  @ManyToOne(() => OrganizationEntity, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string;

  /**
   * User (nullable if event occurs before user creation)
   */
  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  // ===== EVENT CLASSIFICATION =====

  /**
   * Event Type - Specific event that occurred
   */
  @Column({
    name: 'event_type',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  eventType!: SecurityEventType;

  /**
   * Event Category - High-level grouping
   */
  @Column({
    name: 'event_category',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  eventCategory!: SecurityEventCategory;

  /**
   * Severity - Importance/risk level
   */
  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    default: SecurityEventSeverity.INFO,
  })
  severity!: SecurityEventSeverity;

  /**
   * Status - Outcome of the event
   */
  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
  })
  status!: SecurityEventStatus;

  // ===== EVENT DATA =====

  /**
   * Metadata - Flexible JSONB for event-specific data
   *
   * Examples:
   * - OTP: { phone: '+919876543210', otpLength: 6, expirySeconds: 300 }
   * - Login: { method: 'otp', device: 'mobile', os: 'iOS' }
   * - Rate Limit: { limit: 5, window: '1d', currentCount: 6 }
   */
  @Column({
    type: 'jsonb',
    nullable: true,
  })
  metadata?: Record<string, any>;

  /**
   * IP Address - Source IP of the request
   */
  @Column({
    name: 'ip_address',
    type: 'inet',
    nullable: true,
  })
  ipAddress?: string;

  /**
   * User Agent - Browser/device information
   */
  @Column({
    name: 'user_agent',
    type: 'text',
    nullable: true,
  })
  userAgent?: string;

  /**
   * Resource ID - ID of affected resource (e.g., customer ID, project ID)
   */
  @Column({
    name: 'resource_id',
    type: 'uuid',
    nullable: true,
  })
  resourceId?: string;

  /**
   * Resource Type - Type of affected resource
   */
  @Column({
    name: 'resource_type',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  resourceType?: string;

  /**
   * Error Message - If status is FAILED, why it failed
   */
  @Column({
    name: 'error_message',
    type: 'text',
    nullable: true,
  })
  errorMessage?: string;

  // ===== TIMESTAMPS =====
  // Note: createdAt and updatedAt are inherited from BaseEntity

  /**
   * Expires At - For auto-cleanup of old events
   * Useful for temporary data like OTPs, rate limit counters
   */
  @Column({
    name: 'expires_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  expiresAt?: Date;
}

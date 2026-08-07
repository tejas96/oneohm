import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Integration Entity
 * Stores third-party integration configurations per organization
 * Supports multi-tenant, multi-provider integrations (messaging, payment, storage, etc.)
 */
@Entity('integrations')
@Index(['isActive'])
@Index(['provider', 'category'])
@Index(['provider', 'isActive'])
export class IntegrationEntity extends BaseEntity {
  // ===== RELATIONSHIPS =====


  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  // ===== INTEGRATION INFO =====
  @Column({ type: 'varchar', length: 100, nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  provider!: string; // e.g., 'whatsapp-business-api', 'twilio', 'stripe', 'aws-s3'

  @Column({ type: 'varchar', length: 50, nullable: false })
  category!: string; // e.g., 'messaging', 'payment', 'storage', 'analytics'

  // ===== CREDENTIALS & CONFIG =====
  @Column({ name: 'auth_type', type: 'varchar', length: 50, nullable: false })
  authType!: string; // e.g., 'bearer_token', 'api_key', 'oauth2', 'basic_auth'

  /**
   * Encrypted credentials (JSONB)
   * Stored as { encrypted: string } where string contains encrypted provider credentials
   * Structure varies by provider after decryption:
   * - WhatsApp: { accessToken, phoneNumberId, businessAccountId }
   * - Twilio: { accountSid, authToken }
   * - Stripe: { secretKey, publishableKey }
   */
  @Column({ type: 'jsonb', nullable: false })
  credentials!: { encrypted: string };

  /**
   * Additional configuration (JSONB)
   * Non-sensitive provider-specific settings, e.g.:
   * - WhatsApp: { apiUrl, webhookVerifyToken }
   * - Twilio: { phoneNumber, messagingServiceSid }
   */
  @Column({ type: 'jsonb', nullable: true })
  configuration?: Record<string, string | number | boolean>;

  // ===== STATUS =====
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'last_validated_at', type: 'timestamp with time zone', nullable: true })
  lastValidatedAt?: Date;

  @Column({ name: 'validation_error', type: 'text', nullable: true })
  validationError?: string;
}

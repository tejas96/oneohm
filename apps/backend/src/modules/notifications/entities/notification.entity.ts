import { NotificationSeverity, NotificationType } from '@oneohm-epc/shared/types';
import { Column, CreateDateColumn, Entity, Index } from 'typeorm';

/**
 * Notification Entity
 * Generic notification for all application events.
 * type and severity stored as VARCHAR + CHECK — no Postgres ENUM.
 */
@Entity('notifications')
@Index(['organizationId'])
@Index(['userId', 'readAt'])
@Index(['userId', 'createdAt'])
@Index('uq_notifications_user_dedupe', ['userId', 'dedupeKey'], {
  unique: true,
  where: 'dedupe_key IS NOT NULL',
})
export class NotificationEntity {
  @Column({ type: 'uuid', primary: true, default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: NotificationType.SYSTEM,
  })
  type!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  body?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: NotificationSeverity.INFO,
  })
  severity!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  link?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ name: 'dedupe_key', type: 'varchar', length: 255, nullable: true })
  dedupeKey?: string;

  @Column({ name: 'read_at', type: 'timestamp with time zone', nullable: true })
  readAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;
}

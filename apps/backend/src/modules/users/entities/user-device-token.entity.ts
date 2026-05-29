import { Column, Entity, Index } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('user_device_tokens')
@Index(['userId', 'token'], { unique: true })
@Index(['token'], { unique: true })
export class UserDeviceTokenEntity extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'text' })
  token!: string;

  @Column({ type: 'varchar', length: 20 })
  platform!: string;

  @Column({ name: 'device_model', type: 'varchar', length: 100, nullable: true })
  deviceModel?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({
    name: 'last_seen_at',
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastSeenAt!: Date;
}

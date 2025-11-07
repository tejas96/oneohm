import { Role } from '@oneohm-epc/shared-auth';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { UserEntity } from './user.entity';

@Entity('user_roles')
@Index(['userId', 'role'], { unique: true })
export class UserRoleEntity {
  @Column({ primary: true, type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  // ===== RELATIONSHIPS =====
  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  // ===== ROLE =====
  @Column({ type: 'varchar', length: 50 })
  role!: Role;

  // ===== AUDIT =====
  @Column({
    name: 'created_at',
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;
}

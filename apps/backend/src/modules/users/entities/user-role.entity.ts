import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { UserEntity } from './user.entity';
import { RoleEntity } from '../../iam/entities/role.entity';

@Entity('user_roles')
// Actual indexes are created via migrations for proper NULL handling
export class UserRoleEntity {
  @Column({ primary: true, type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  // ===== RELATIONSHIPS =====
  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  // ===== ROLE (Old enum-based, now nullable — deprecated in favour of role_id) =====
  @Column({ type: 'varchar', length: 50, nullable: true })
  role?: string | null;

  // ===== NEW IAM: Dynamic Role ID =====
  @Column({ name: 'role_id', type: 'uuid', nullable: true })
  roleId?: string | null;

  // ===== IAM ROLE RELATION =====
  @ManyToOne(() => RoleEntity, { nullable: true })
  @JoinColumn({ name: 'role_id' })
  iamRole?: RoleEntity;

  // ===== ORGANIZATION (For multi-tenant role assignment) =====

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

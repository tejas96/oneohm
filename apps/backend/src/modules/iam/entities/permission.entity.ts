import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { RolePermissionEntity } from './role-permission.entity';

@Entity('permissions')
@Index(['code'], { unique: true })
@Index(['action'])
@Index(['scope'])
export class PermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToMany(() => RolePermissionEntity, (rolePermission) => rolePermission.permission)
  rolePermissions!: RolePermissionEntity[];

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50 })
  action!: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'all',
  })
  scope!: 'all' | 'own' | 'department' | 'assigned' | 'custom';

  @Column({ name: 'conditions', type: 'jsonb', nullable: true })
  conditionsData?: Record<string, unknown> | null;

  @Column({
    name: 'permission_level',
    type: 'varchar',
    length: 50,
    default: 'standard',
  })
  permissionLevel!: 'basic' | 'standard' | 'advanced' | 'admin';

  @Column({ name: 'show_in_menu', type: 'boolean', default: true })
  showInMenu!: boolean;

  @Column({ name: 'menu_label', type: 'varchar', length: 255, nullable: true })
  menuLabel?: string;

  @Column({
    name: 'depends_on_permission_ids',
    type: 'uuid',
    array: true,
    nullable: true,
  })
  dependsOnPermissionIds?: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'is_system_permission', type: 'boolean', default: true })
  isSystemPermission!: boolean;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
  })
  updatedAt!: Date;
}

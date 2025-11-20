import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { FeatureEntity } from './feature.entity';
import { RolePermissionEntity } from './role-permission.entity';

/**
 * Permission Entity
 * Represents granular permissions tied to features (e.g., customers:create, customers:read)
 * Schema: Lines 130-177
 */
@Entity('permissions')
@Index(['code'], { unique: true })
@Index(['featureId', 'isActive'])
@Index(['action'])
@Index(['scope'])
export class PermissionEntity {
  // ==================== Primary Key ====================

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== Relations ====================

  @ManyToOne(() => FeatureEntity, (feature) => feature.permissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'feature_id' })
  feature!: FeatureEntity;

  @OneToMany(() => RolePermissionEntity, (rolePermission) => rolePermission.permission)
  rolePermissions!: RolePermissionEntity[];

  // ==================== Foreign Keys ====================

  @Column({ name: 'feature_id', type: 'uuid' })
  featureId!: string;

  // ==================== Permission Details ====================

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // ==================== Action Type ====================

  @Column({ type: 'varchar', length: 50 })
  action!: string;

  // ==================== Scope/Context ====================

  @Column({
    type: 'varchar',
    length: 50,
    default: 'all',
  })
  scope!: 'all' | 'own' | 'department' | 'assigned' | 'custom';

  // ==================== Conditional Access (JSONB for future ABAC support) ====================

  @Column({ name: 'conditions', type: 'jsonb', nullable: true })
  conditionsData?: Record<string, unknown> | null;

  // ==================== Permission Level ====================

  @Column({
    name: 'permission_level',
    type: 'varchar',
    length: 50,
    default: 'standard',
  })
  permissionLevel!: 'basic' | 'standard' | 'advanced' | 'admin';

  // ==================== UI Access Control ====================

  @Column({ name: 'show_in_menu', type: 'boolean', default: true })
  showInMenu!: boolean;

  @Column({ name: 'menu_label', type: 'varchar', length: 255, nullable: true })
  menuLabel?: string;

  // ==================== Dependencies ====================

  @Column({
    name: 'depends_on_permission_ids',
    type: 'uuid',
    array: true,
    nullable: true,
  })
  dependsOnPermissionIds?: string[];

  // ==================== Status ====================

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'is_system_permission', type: 'boolean', default: true })
  isSystemPermission!: boolean;

  // ==================== Timestamps ====================

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

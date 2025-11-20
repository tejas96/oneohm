import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { RolePermissionEntity } from './role-permission.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Role Entity
 * Represents dynamic, organization-specific roles (replaces hardcoded enum)
 * Schema: Lines 217-241
 */
@Entity('roles')
@Index(['organizationId', 'code'], { unique: true })
@Index(['organizationId', 'deletedAt'])
@Index(['parentRoleId', 'deletedAt'])
@Index(['code', 'deletedAt'])
export class RoleEntity {
  // ==================== Primary Key ====================

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== Relations ====================

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

  @ManyToOne(() => RoleEntity, (role) => role.children, { nullable: true })
  @JoinColumn({ name: 'parent_role_id' })
  parent?: RoleEntity;

  @OneToMany(() => RoleEntity, (role) => role.parent)
  children!: RoleEntity[];

  @OneToMany(() => RolePermissionEntity, (rolePermission) => rolePermission.role)
  rolePermissions!: RolePermissionEntity[];

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;

  // ==================== Foreign Keys ====================

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'parent_role_id', type: 'uuid', nullable: true })
  parentRoleId?: string;

  // ==================== Role Info ====================

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // ==================== Role Hierarchy ====================

  @Column({ type: 'integer', default: 0 })
  level!: number;

  // ==================== System Roles ====================

  @Column({ name: 'is_system_role', type: 'boolean', default: false })
  isSystemRole!: boolean;

  // ==================== Audit ====================

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

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  deletedAt?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;
}

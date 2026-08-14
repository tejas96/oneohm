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

/**
 * A permission code.
 *
 * The catalog is fixed in the web app (`apps/web/lib/rbac/catalog.ts`) and
 * mirrored here by migration 1855000000000-ResetRbacCatalog so the superadmin
 * role builder has something to list. Nothing creates rows at runtime — the
 * write endpoints were removed, because a code with no UI wired to it gates
 * nothing.
 *
 * The old model carried action/scope/conditions/permission_level and friends
 * for an ABAC-style engine that was never built. Those columns are gone.
 */
// No index on `module`. The catalog is 42 rows and is read whole by the role
// builder; an index would cost writes it never earns back on a table this size.
@Entity('permissions')
@Index(['code'], { unique: true })
export class PermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToMany(() => RolePermissionEntity, (rolePermission) => rolePermission.permission)
  rolePermissions!: RolePermissionEntity[];

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  code!: string;

  /** User-facing. Shown in the access dialog to whoever was just refused. */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /** Groups the checkbox list in the role builder. */
  @Column({ type: 'varchar', length: 50 })
  module!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

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

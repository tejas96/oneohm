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

import { PermissionEntity } from './permission.entity';

/**
 * Feature Entity
 * Represents application features/modules (e.g., Customers, Inventory, Projects)
 * Schema: Lines 84-120
 */
@Entity('features')
@Index(['code'], { unique: true })
@Index(['name'], { unique: true })
@Index(['parentFeatureId'])
@Index(['featureType', 'isActive'])
@Index(['isActive'])
export class FeatureEntity {
  // ==================== Primary Key ====================

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== Relations ====================

  @ManyToOne(() => FeatureEntity, (feature) => feature.children, {
    nullable: true,
  })
  @JoinColumn({ name: 'parent_feature_id' })
  parent?: FeatureEntity;

  @OneToMany(() => FeatureEntity, (feature) => feature.parent)
  children!: FeatureEntity[];

  @OneToMany(() => PermissionEntity, (permission) => permission.feature)
  permissions!: PermissionEntity[];

  // ==================== Foreign Keys ====================

  @Column({ name: 'parent_feature_id', type: 'uuid', nullable: true })
  parentFeatureId?: string;

  // ==================== Feature Info ====================

  @Column({ type: 'varchar', length: 255, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // ==================== UI Metadata ====================

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon?: string;

  @Column({ name: 'display_order', type: 'integer', default: 0 })
  displayOrder!: number;

  // ==================== Feature Type ====================

  @Column({
    name: 'feature_type',
    type: 'varchar',
    length: 50,
    default: 'module',
  })
  featureType!: 'module' | 'sub_feature' | 'component' | 'workflow';

  // ==================== Access Control ====================

  @Column({ name: 'requires_license', type: 'boolean', default: false })
  requiresLicense!: boolean;

  @Column({ name: 'license_tier', type: 'varchar', length: 50, nullable: true })
  licenseTier?: string;

  // ==================== Status ====================

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'is_system_feature', type: 'boolean', default: true })
  isSystemFeature!: boolean;

  // ==================== Metadata ====================

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

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

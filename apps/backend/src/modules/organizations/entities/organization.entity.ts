import { OrganizationStatus } from '@oneohm-epc/shared/types';
import { Column, DeleteDateColumn, Entity, Index, OneToMany } from 'typeorm';

import { OrganizationSettingEntity } from './organization-setting.entity';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Organization Entity
 * Represents a company/organization in the system
 */
@Entity('organizations')
@Index(['code'])
@Index(['status', 'deletedAt'])
export class OrganizationEntity extends BaseEntity {
  // Basic Info
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: false })
  code: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  // Address Details
  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string | null;

  @Column({ type: 'varchar', length: 100, default: 'India' })
  country: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  pincode: string | null;

  // Tax Details
  @Column({ type: 'varchar', length: 15, nullable: true })
  gstin: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  pan: string | null;

  // Settings
  @Column({ type: 'varchar', length: 50, default: 'Asia/Kolkata' })
  timezone: string;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency: string;

  @Column({ type: 'varchar', length: 20, default: 'DD-MM-YYYY', name: 'date_format' })
  dateFormat: string;

  // Business Settings
  @Column({ type: 'int', default: 4, name: 'default_project_timeline_weeks' })
  defaultProjectTimelineWeeks: number;

  @Column({ type: 'int', default: 30, name: 'default_quote_validity_days' })
  defaultQuoteValidityDays: number;

  @Column({ type: 'int', default: 3, name: 'max_quote_versions' })
  maxQuoteVersions: number;

  // Status
  @Column({
    type: 'enum',
    enum: OrganizationStatus, // TypeORM Column decorator accepts enum directly
    default: OrganizationStatus.ACTIVE,
  })
  status: OrganizationStatus;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'subscription_plan' })
  subscriptionPlan: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true, name: 'subscription_expires_at' })
  subscriptionExpiresAt: Date | null;

  // Audit Fields (inherited from BaseEntity: id, createdAt, updatedAt)
  @DeleteDateColumn({ type: 'timestamp with time zone', name: 'deleted_at' })
  deletedAt: Date | null;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdBy: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'updated_by' })
  updatedBy: string | null;

  // Relationships
  @OneToMany(() => OrganizationSettingEntity, (setting) => setting.organization)
  settings: OrganizationSettingEntity[];
}

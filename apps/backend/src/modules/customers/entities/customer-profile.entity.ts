import { CustomerStatus } from '@oneohm-epc/shared/types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { CustomerPropertyEntity } from './customer-property.entity';
import { FollowupEntity } from './followup.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Customer Profile Entity
 * Stores customer-specific profile data
 * A user can have one customer profile per organization
 */
@Entity('customer_profiles')
@Index(['userId', 'organizationId'], { unique: true })
@Index(['organizationId', 'status', 'deletedAt'])
@Index(['phone'], { where: 'deleted_at IS NULL' })
@Index(['email'], { where: 'deleted_at IS NULL' })
// Composite unique constraints managed by migration 1788000000000:
//   uq_customer_profiles_org_phone  — UNIQUE (organization_id, phone)       WHERE deleted_at IS NULL
//   uq_customer_profiles_org_email  — UNIQUE (organization_id, LOWER(email)) WHERE deleted_at IS NULL
export class CustomerProfileEntity extends BaseEntity {
  // ==================== RELATIONSHIPS ====================
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;

  // ==================== PROPERTIES (One-to-Many) ====================
  @OneToMany(() => CustomerPropertyEntity, (property) => property.customer)
  properties?: CustomerPropertyEntity[];

  // ==================== FOLLOWUPS (One-to-Many) ====================
  @OneToMany(() => FollowupEntity, (followup) => followup.customer)
  followups?: FollowupEntity[];

  // ==================== Human-readable Code ====================
  @Column({ name: 'customer_code', type: 'varchar', length: 50, nullable: true, unique: true })
  customerCode?: string;

  // ==================== Personal Info ====================
  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ name: 'middle_name', type: 'varchar', length: 100, nullable: true })
  middleName?: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
  lastName?: string;

  // ==================== Contact Info ====================
  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ name: 'alternate_phone', type: 'varchar', length: 20, nullable: true })
  alternatePhone?: string;

  // ==================== Address (Billing/Mailing) ====================
  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state?: string;

  @Column({ type: 'varchar', length: 100, default: 'India' })
  country!: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  pincode?: string;

  // ==================== Source Tracking ====================
  @Column({ name: 'lead_source', type: 'varchar', length: 50, nullable: true })
  leadSource?: string;

  @Column({ name: 'referral_code', type: 'varchar', length: 50, nullable: true })
  referralCode?: string;

  // ==================== Customer Group ====================
  @Column({ name: 'group_code', type: 'varchar', length: 20, nullable: true })
  groupCode?: string;

  @Column({ name: 'group_name', type: 'varchar', length: 100, nullable: true })
  groupName?: string;

  // ==================== Status ====================
  @Column({
    type: 'varchar',
    length: 20,
    default: CustomerStatus.ACTIVE,
  })
  status!: CustomerStatus;

  // ==================== Audit Fields ====================
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @ManyToOne(() => UserEntity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  @ManyToOne(() => UserEntity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;
}

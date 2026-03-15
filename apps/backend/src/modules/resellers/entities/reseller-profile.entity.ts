import { ResellerStatus } from '@oneohm-epc/shared/types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Reseller Profile Entity
 * Stores reseller-specific profile data
 * A user can have one reseller profile per organization
 */
@Entity('reseller_profiles')
@Index(['userId', 'organizationId'], { unique: true })
@Index(['organizationId', 'status', 'deletedAt'])
@Index(['organizationId', 'companyCode'], { unique: true })
@Index(['email'], { where: 'deleted_at IS NULL' })
@Index(['phone'], { where: 'deleted_at IS NULL' })
export class ResellerProfileEntity extends BaseEntity {
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

  // ==================== Company Details ====================
  @Column({ name: 'company_name', type: 'varchar', length: 255 })
  companyName!: string;

  @Column({ name: 'company_code', type: 'varchar', length: 50 })
  companyCode!: string;

  // ==================== Contact Person (Organization-Specific) ====================
  @Column({ name: 'contact_person_name', type: 'varchar', length: 255, nullable: true })
  contactPersonName?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ name: 'alternate_phone', type: 'varchar', length: 20, nullable: true })
  alternatePhone?: string;

  // ==================== Address ====================
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

  // ==================== Business Details ====================
  @Column({ type: 'varchar', length: 15, nullable: true })
  gstin?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  pan?: string;

  // ==================== Commission Structure ====================
  @Column({ name: 'commission_percentage', type: 'decimal', precision: 5, scale: 2, default: 4.0 })
  commissionPercentage!: number;

  @Column({
    name: 'commission_min_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 2.0,
  })
  commissionMinPercentage!: number;

  @Column({
    name: 'commission_max_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 10.0,
  })
  commissionMaxPercentage!: number;

  // ==================== Bank Details ====================
  @Column({ name: 'bank_name', type: 'varchar', length: 255, nullable: true })
  bankName?: string;

  @Column({ name: 'account_number', type: 'varchar', length: 50, nullable: true })
  accountNumber?: string;

  @Column({ name: 'ifsc_code', type: 'varchar', length: 20, nullable: true })
  ifscCode?: string;

  @Column({ name: 'account_holder_name', type: 'varchar', length: 255, nullable: true })
  accountHolderName?: string;

  // ==================== Performance Tracking ====================
  @Column({ name: 'total_leads_generated', type: 'integer', default: 0 })
  totalLeadsGenerated!: number;

  @Column({ name: 'total_projects_converted', type: 'integer', default: 0 })
  totalProjectsConverted!: number;

  @Column({ name: 'total_revenue_generated', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalRevenueGenerated!: number;

  @Column({ name: 'total_commission_earned', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalCommissionEarned!: number;

  // ==================== Status ====================
  @Column({
    type: 'varchar',
    length: 20,
    default: ResellerStatus.ACTIVE,
  })
  status!: ResellerStatus;

  // ==================== Audit Fields ====================
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;
}

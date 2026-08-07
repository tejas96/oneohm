import { EmployeeProfileKind, UserGender, UserStatus } from '@tejas96/shared/types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Employee Profile Entity
 * Stores employee-specific profile data
 * A user can have one employee profile per organization
 *
 * `profileKind` distinguishes staff rows from reseller rows (formerly stored
 * in a separate `reseller_profiles` table, merged in here — see
 * EmployeeProfileKind). Reseller-only columns below are NULL for
 * profileKind='staff' rows.
 */
@Entity('employee_profiles')
@Index(['userId'], { unique: true })
@Index(['status', 'deletedAt'])
@Index(['employeeId'], { unique: true })
@Index(['department', 'deletedAt'])
@Index(['companyCode'], { unique: true, where: 'company_code IS NOT NULL' })
@Index(['profileKind', 'status', 'deletedAt'])
export class EmployeeProfileEntity extends BaseEntity {
  // ==================== RELATIONSHIPS ====================
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;



  // ==================== Profile Kind ====================
  @Column({
    name: 'profile_kind',
    type: 'varchar',
    length: 20,
    default: EmployeeProfileKind.STAFF,
  })
  profileKind!: EmployeeProfileKind;

  // ==================== Contact Info (Organization-Specific) ====================
  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({
    name: 'alternate_phone',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  alternatePhone?: string;

  // ==================== Profile ====================
  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl?: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth?: Date;

  @Column({ type: 'varchar', length: 20, nullable: true })
  gender?: UserGender;

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

  // ==================== Employment ====================
  @Column({ name: 'employee_id', type: 'varchar', length: 50, nullable: true })
  employeeId?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  designation?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department?: string;

  @Column({ name: 'joining_date', type: 'date', nullable: true })
  joiningDate?: Date;

  // ==================== Reseller: Company Details ====================
  @Column({ name: 'company_name', type: 'varchar', length: 255, nullable: true })
  companyName?: string;

  @Column({ name: 'company_code', type: 'varchar', length: 50, nullable: true })
  companyCode?: string;

  @Column({ name: 'contact_person_name', type: 'varchar', length: 255, nullable: true })
  contactPersonName?: string;

  // ==================== Reseller: Business Details ====================
  @Column({ type: 'varchar', length: 15, nullable: true })
  gstin?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  pan?: string;

  // ==================== Reseller: Commission Structure ====================
  @Column({
    name: 'commission_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  commissionPercentage?: number;

  // ==================== Reseller: Bank Details ====================
  @Column({ name: 'bank_name', type: 'varchar', length: 255, nullable: true })
  bankName?: string;

  @Column({ name: 'account_number', type: 'varchar', length: 50, nullable: true })
  accountNumber?: string;

  @Column({ name: 'ifsc_code', type: 'varchar', length: 20, nullable: true })
  ifscCode?: string;

  @Column({ name: 'account_holder_name', type: 'varchar', length: 255, nullable: true })
  accountHolderName?: string;

  // ==================== Reseller: Performance Tracking ====================
  @Column({ name: 'total_leads_generated', type: 'integer', nullable: true })
  totalLeadsGenerated?: number;

  @Column({ name: 'total_projects_converted', type: 'integer', nullable: true })
  totalProjectsConverted?: number;

  @Column({
    name: 'total_revenue_generated',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  totalRevenueGenerated?: number;

  @Column({
    name: 'total_commission_earned',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  totalCommissionEarned?: number;

  // ==================== Status ====================
  @Column({
    type: 'varchar',
    length: 20,
    default: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  // ==================== Audit Fields ====================
  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
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

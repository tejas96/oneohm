import { UserGender, UserStatus } from '@oneohm-epc/shared-types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { UserEntity } from './user.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';

/**
 * Employee Profile Entity
 * Stores employee-specific profile data
 * A user can have one employee profile per organization
 */
@Entity('employee_profiles')
@Index(['userId', 'organizationId'], { unique: true })
@Index(['organizationId', 'status', 'deletedAt'])
@Index(['organizationId', 'employeeId'], { unique: true })
@Index(['department', 'deletedAt'])
export class EmployeeProfileEntity extends BaseEntity {
  // ==================== RELATIONSHIPS ====================
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => OrganizationEntity, { nullable: false })
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;

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

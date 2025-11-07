import { UserStatus } from '@oneohm-epc/shared-types';
import * as bcrypt from 'bcrypt';
import { BeforeInsert, BeforeUpdate, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';

@Entity('users')
@Index(['organizationId', 'deletedAt'])
@Index(['email', 'deletedAt'])
@Index(['phone', 'deletedAt'])
@Index(['department', 'deletedAt'])
export class UserEntity extends BaseEntity {
  // ===== RELATIONSHIPS =====
  @ManyToOne(() => OrganizationEntity, { nullable: false })
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  // ===== PERSONAL INFO =====
  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
  lastName?: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  phone!: string;

  @Column({
    name: 'alternate_phone',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  alternatePhone?: string;

  // ===== AUTHENTICATION =====
  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({
    name: 'email_verified_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  emailVerifiedAt?: Date;

  @Column({
    name: 'phone_verified_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  phoneVerifiedAt?: Date;

  @Column({
    name: 'last_login_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  lastLoginAt?: Date;

  // ===== PROFILE =====
  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl?: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth?: Date;

  @Column({ type: 'varchar', length: 20, nullable: true })
  gender?: string;

  // ===== ADDRESS =====
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

  // ===== EMPLOYMENT =====
  @Column({ name: 'employee_id', type: 'varchar', length: 50, nullable: true })
  employeeId?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  designation?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department?: string;

  @Column({ name: 'joining_date', type: 'date', nullable: true })
  joiningDate?: Date;

  // ===== STATUS =====
  @Column({
    type: 'varchar',
    length: 20,
    default: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  // ===== SOFT DELETE =====
  @Column({
    name: 'deleted_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  deletedAt?: Date;

  // ===== AUDIT =====
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  // ===== VIRTUAL FIELD (not persisted) =====
  roles?: string[]; // Will be populated from user_roles join

  // ===== HOOKS =====
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    // Only hash if password is being set/changed and is not already hashed
    if (this.passwordHash && !this.passwordHash.startsWith('$2b$')) {
      this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
    }
  }

  // ===== METHODS =====
  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }

  get fullName(): string {
    return this.lastName ? `${this.firstName} ${this.lastName}` : this.firstName;
  }
}

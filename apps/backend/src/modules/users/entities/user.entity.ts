import { UserStatus } from '@oneohm-epc/shared/types';
import * as bcrypt from 'bcrypt';
import { BeforeInsert, BeforeUpdate, Column, DeleteDateColumn, Entity, Index } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * User Entity
 * Core authentication entity - stores only authentication and basic user info
 * Profile-specific data stored in: CustomerProfile, ResellerProfile, EmployeeProfile
 * A user can have multiple profile types across multiple organizations
 */
@Entity('users')
@Index(['email'])
@Index(['phone'])
export class UserEntity extends BaseEntity {
  // ===== BASIC INFO =====
  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
  lastName?: string;

  // ===== CONTACT INFO =====
  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  phone!: string;

  // ===== AUTHENTICATION =====
  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash?: string;

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

  // ===== PASSWORD RESET =====
  @Column({
    name: 'password_reset_token',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  passwordResetToken?: string | null;

  @Column({
    name: 'password_reset_expires',
    type: 'timestamp with time zone',
    nullable: true,
  })
  passwordResetExpires?: Date | null;

  // ===== PROFILE COMPLETION =====
  @Column({
    name: 'profile_completed',
    type: 'boolean',
    default: false,
  })
  profileCompleted!: boolean;

  // ===== STATUS =====
  @Column({
    type: 'varchar',
    length: 20,
    default: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  // ===== SOFT DELETE =====
  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletedAt?: Date;

  // ===== VIRTUAL FIELDS (not persisted, populated at runtime) =====
  roles?: string[]; // Will be populated from user_roles join
  permissions?: string[]; // Will be populated from IAM system

  // ===== HOOKS =====
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    // Only hash if password is being set/changed and is not already hashed
    if (this.passwordHash && !/^\$2[aby]\$/.test(this.passwordHash)) {
      this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
    }
  }

  // ===== METHODS =====
  async validatePassword(password: string): Promise<boolean> {
    if (!this.passwordHash) {
      return false;
    }
    return bcrypt.compare(password, this.passwordHash);
  }

  get fullName(): string {
    return this.lastName ? `${this.firstName} ${this.lastName}` : this.firstName;
  }
}

import { CustomerStatus } from '@oneohm-epc/shared-types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { ResellerEntity } from '../../resellers/entities/reseller.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Customer Entity
 * Represents customers/leads in the EPC system
 */
@Entity('customers')
@Index(['organizationId', 'status', 'deletedAt'])
@Index(['phone'], { where: 'deleted_at IS NULL' })
@Index(['email'], { where: 'deleted_at IS NULL' })
@Index(['consumerNumber'], { where: 'deleted_at IS NULL' })
export class CustomerEntity extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  // ==================== Personal Info ====================
  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
  lastName?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  @Column({ name: 'alternate_phone', type: 'varchar', length: 20, nullable: true })
  alternatePhone?: string;

  // ==================== Consumer Details ====================
  @Column({ name: 'consumer_number', type: 'varchar', length: 50, nullable: true })
  consumerNumber?: string;

  @Column({ name: 'consumer_name', type: 'varchar', length: 255, nullable: true })
  consumerName?: string;

  @Column({ name: 'current_load', type: 'varchar', length: 50, nullable: true })
  currentLoad?: string;

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

  @Column({ name: 'location_coordinates', type: 'point', nullable: true })
  locationCoordinates?: string; // Stored as "POINT(lat lng)" string

  // ==================== Property Details ====================
  @Column({ name: 'property_name', type: 'varchar', length: 255, nullable: true })
  propertyName?: string;

  @Column({ name: 'property_type', type: 'varchar', length: 50, nullable: true })
  propertyType?: string;

  // ==================== Source Tracking ====================
  @Column({ name: 'lead_source', type: 'varchar', length: 50, nullable: true })
  leadSource?: string;

  @Column({ name: 'referral_code', type: 'varchar', length: 50, nullable: true })
  referralCode?: string;

  @Column({ name: 'reseller_id', type: 'uuid', nullable: true })
  resellerId?: string;

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

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  // ==================== Relationships ====================
  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;

  @ManyToOne(() => ResellerEntity)
  @JoinColumn({ name: 'reseller_id' })
  reseller?: ResellerEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;
}

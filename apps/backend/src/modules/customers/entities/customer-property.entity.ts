import {
  ConnectionType,
  LeadTemperature,
  type PropertyDocument,
  PropertyStatus,
  PropertyType,
} from '@oneohm-epc/shared-types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';

import { CustomerProfileEntity } from './customer-profile.entity';
import type { FollowupEntity } from './followup.entity';
import type { SiteVisitEntity } from './site-visit.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import type { ProjectEntity } from '../../projects/entities/project.entity';
import { QuoteEntity } from '../../quotes/entities/quote.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Customer Property Entity
 * Represents an installation site/property belonging to a customer
 * One customer can have multiple properties (one-to-many relationship)
 */
@Entity('customer_properties')
@Index(['customerId', 'organizationId'])
@Index(['organizationId', 'status', 'deletedAt'])
@Index(['organizationId', 'leadTemperature', 'deletedAt'])
@Index(['consumerNumber'], { where: 'deleted_at IS NULL' })
@Index(['pincode'])
export class CustomerPropertyEntity extends BaseEntity {
  // ==================== RELATIONSHIPS ====================
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => CustomerProfileEntity, (customer) => customer.properties, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id' })
  customer?: CustomerProfileEntity;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;

  // ==================== SITE VISIT (One-to-One) ====================
  @OneToOne('SiteVisitEntity', 'customerProperty')
  siteVisit?: SiteVisitEntity;

  // ==================== QUOTES (One-to-Many) ====================
  @OneToMany(() => QuoteEntity, (quote) => quote.property)
  quotes?: QuoteEntity[];

  // ==================== PROJECT (One-to-One) ====================
  // One property can have only one project
  // Using string reference to avoid circular import (ProjectEntity imports CustomerPropertyEntity)
  @OneToOne('ProjectEntity', 'property')
  project?: ProjectEntity;

  // ==================== Human-readable Code ====================
  @Column({ name: 'property_code', type: 'varchar', length: 50, nullable: true, unique: true })
  propertyCode?: string;

  // ==================== PROPERTY DETAILS ====================
  @Column({ name: 'property_name', type: 'varchar', length: 255, nullable: true })
  propertyName?: string;

  @Column({
    name: 'property_type',
    type: 'varchar',
    length: 50,
    default: PropertyType.RESIDENTIAL,
  })
  propertyType!: PropertyType;

  // ==================== ADDRESS ====================
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
  locationCoordinates?: string; // Stored as "POINT(lat lng)"

  // ==================== ELECTRICITY/CONSUMER DETAILS ====================
  @Column({ name: 'consumer_number', type: 'varchar', length: 50, nullable: true })
  consumerNumber?: string;

  @Column({ name: 'consumer_name', type: 'varchar', length: 255, nullable: true })
  consumerName?: string;

  @Column({ name: 'current_load', type: 'varchar', length: 50, nullable: true })
  currentLoad?: string;

  @Column({ name: 'discom_name', type: 'varchar', length: 100, nullable: true })
  discomName?: string;

  @Column({ name: 'connection_type', type: 'varchar', length: 20, nullable: true })
  connectionType?: ConnectionType;

  @Column({ name: 'sanctioned_load', type: 'decimal', precision: 10, scale: 2, nullable: true })
  sanctionedLoad?: number;

  @Column({ name: 'meter_number', type: 'varchar', length: 50, nullable: true })
  meterNumber?: string;

  // ==================== SITE DETAILS ====================
  @Column({ name: 'monthly_bill', type: 'decimal', precision: 10, scale: 2, nullable: true })
  monthlyBill?: number;

  @Column({ name: 'roof_area_sqft', type: 'decimal', precision: 10, scale: 2, nullable: true })
  roofAreaSqft?: number;

  // ==================== LEAD TRACKING ====================
  @Column({
    name: 'lead_temperature',
    type: 'varchar',
    length: 20,
    default: LeadTemperature.WARM,
  })
  leadTemperature!: LeadTemperature;

  // ==================== FOLLOWUPS (One-to-Many Relation) ====================
  /**
   * Property followups - scheduled activities
   * Stored in dedicated followups table
   */
  @OneToMany('FollowupEntity', 'property')
  followups?: FollowupEntity[];

  // ==================== FLAGS ====================
  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary!: boolean;

  @Column({ name: 'wants_loan', type: 'boolean', default: false })
  wantsLoan!: boolean;

  // ==================== DOCUMENTS ====================
  /**
   * Property-level documents (identity docs, KYC, etc.)
   * Stored as JSONB array: [{ url, tag, fileName }, ...]
   * Used when customer uploads documents without loan application
   */
  @Column({ type: 'jsonb', default: [] })
  documents!: PropertyDocument[];

  // ==================== STATUS ====================
  @Column({ type: 'varchar', length: 20, default: PropertyStatus.ACTIVE })
  status!: PropertyStatus;

  // ==================== NOTES ====================
  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ==================== AUDIT FIELDS ====================
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

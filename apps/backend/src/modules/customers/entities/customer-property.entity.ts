import {
  ConnectionType,
  LeadTemperature,
  LossReason,
  type GpsCoordinates,
  type PropertyDocument,
  type StoredChangeRequest,
  PropertyStatus,
  PropertyType,
  type ShadingAnalysis,
  SiteStatus,
  type SurveyData,
} from '@tejas96/shared/types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { CustomerProfileEntity } from './customer-profile.entity';
import type { FollowupEntity } from './followup.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DiscomEntity } from '../../discoms/entities/discom.entity';
import type { ProjectEntity } from '../../projects/entities/project.entity';
import { QuoteEntity } from '../../quotes/entities/quote.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Customer Property Entity
 * Represents an installation site/property belonging to a customer
 * One customer can have multiple properties (one-to-many relationship)
 */
@Entity('customer_properties')
@Index(['customerId'])
@Index(['status', 'deletedAt'])
@Index(['leadTemperature', 'deletedAt'])
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

  // ==================== QUOTES (One-to-Many) ====================
  @OneToMany(() => QuoteEntity, (quote) => quote.property)
  quotes?: QuoteEntity[];

  // ==================== PROJECTS (One-to-Many) ====================
  // A roof can hold several cancelled projects plus at most one live one —
  // see project.entity.ts and migration 1857015000000-OneLiveProjectPerRoof.
  // Using string reference to avoid circular import (ProjectEntity imports CustomerPropertyEntity)
  @OneToMany('ProjectEntity', 'property')
  projects?: ProjectEntity[];

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

  @Column({ name: 'gps_coordinates', type: 'jsonb', nullable: true })
  gpsCoordinates?: GpsCoordinates;

  // ==================== ELECTRICITY/CONSUMER DETAILS ====================
  @Column({ name: 'consumer_number', type: 'varchar', length: 50, nullable: true })
  consumerNumber?: string;

  @Column({ name: 'consumer_name', type: 'varchar', length: 255, nullable: true })
  consumerName?: string;

  @Column({ name: 'current_load', type: 'varchar', length: 50, nullable: true })
  currentLoad?: string;

  @Column({ name: 'discom_id', type: 'uuid', nullable: true })
  discomId?: string;

  @ManyToOne(() => DiscomEntity, (discom) => discom.properties, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'discom_id' })
  discom?: DiscomEntity;

  @Column({ name: 'connection_type', type: 'varchar', length: 20, nullable: true })
  connectionType?: ConnectionType;

  @Column({ name: 'sanctioned_load', type: 'decimal', precision: 10, scale: 2, nullable: true })
  sanctionedLoad?: number;

  @Column({ name: 'meter_number', type: 'varchar', length: 50, nullable: true })
  meterNumber?: string;

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

  /**
   * Which lender the customer named. A `BANKS` code from the shared package, or
   * the name a rep typed under "Other" — never the literal word "other".
   *
   * Distinct from `loan_applications.lender_name`, which is where they actually
   * applied, filled in later by the finance team.
   */
  @Column({ name: 'financing_bank', type: 'varchar', length: 100, nullable: true })
  financingBank?: string | null;

  // ==================== DOCUMENTS ====================
  /**
   * Property-level documents (identity docs, KYC, etc.)
   * Stored as JSONB array: [{ url, tag, fileName }, ...]
   * Used when customer uploads documents without loan application
   */
  @Column({ type: 'jsonb', default: [] })
  documents!: PropertyDocument[];

  /**
   * Change-of-request items captured at property creation.
   * Materialized as special project tasks when the property is converted to a project.
   */
  @Column({ name: 'change_requests', type: 'jsonb', default: [] })
  changeRequests!: StoredChangeRequest[];

  // ==================== STATUS ====================
  @Column({ type: 'varchar', length: 20, default: PropertyStatus.ACTIVE })
  status!: PropertyStatus;

  // ==================== LOST TRACKING ====================
  /** Set together with status = LOST. Captured at the moment someone knows why. */
  @Column({ name: 'lost_reason', type: 'text', nullable: true })
  lostReason?: string;

  @Column({ name: 'lost_at', type: 'timestamptz', nullable: true })
  lostAt?: Date;

  @Column({ name: 'loss_reason', type: 'varchar', length: 40, nullable: true })
  lossReason?: LossReason;

  // ==================== NOTES ====================
  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ==================== SITE VISIT / SURVEY ====================
  @Column({ name: 'site_status', type: 'varchar', length: 20, default: SiteStatus.PENDING })
  siteStatus!: SiteStatus;

  @Column({ name: 'site_visit_done', type: 'boolean', default: false })
  siteVisitDone!: boolean;

  @Column({
    name: 'available_roof_area_sqft',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  availableRoofAreaSqft?: number;

  @Column({ name: 'shading_analysis', type: 'jsonb', nullable: true })
  shadingAnalysis?: ShadingAnalysis;

  @Column({ name: 'site_notes', type: 'text', nullable: true })
  siteNotes?: string;

  @Column({ name: 'survey_done', type: 'boolean', default: false })
  surveyDone!: boolean;

  @Column({ name: 'survey_data', type: 'jsonb', nullable: true })
  surveyData?: SurveyData;

  @Column({ name: 'site_visit_assignee', type: 'uuid', nullable: true })
  siteVisitAssignee?: string;

  @ManyToOne(() => UserEntity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'site_visit_assignee' })
  siteVisitAssigneeUser?: UserEntity;

  @Column({ name: 'site_survey_assignee', type: 'uuid', nullable: true })
  siteSurveyAssignee?: string;

  @ManyToOne(() => UserEntity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'site_survey_assignee' })
  siteSurveyAssigneeUser?: UserEntity;

  @Column({ name: 'site_visit_completed_at', type: 'timestamptz', nullable: true })
  siteVisitCompletedAt?: Date;

  @Column({ name: 'site_survey_completed_at', type: 'timestamptz', nullable: true })
  siteSurveyCompletedAt?: Date;

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

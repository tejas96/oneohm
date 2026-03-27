import {
  SiteActivityStatus,
  type GpsCoordinates,
  type ShadingAnalysis,
  type SurveyData,
} from '@oneohm-epc/shared/types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { CustomerPropertyEntity } from '../../customers/entities/customer-property.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Site Activity Entity (Option B)
 * Single row per property. Visit and survey are phases, not separate entities.
 * OneToOne with CustomerPropertyEntity.
 */
@Entity('site_activities')
@Index(['customerPropertyId'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['activityNumber'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['overallStatus'], { where: '"deleted_at" IS NULL' })
@Index(['organizationId', 'deletedAt'])
export class SiteActivityEntity extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => OrganizationEntity, { nullable: false })
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;

  @Column({
    name: 'overall_status',
    type: 'varchar',
    length: 20,
    default: SiteActivityStatus.PENDING,
  })
  overallStatus!: SiteActivityStatus;

  @Column({ name: 'activity_number', type: 'varchar', length: 50 })
  activityNumber!: string;

  // OneToOne with property (unique index preserved)
  @Column({ name: 'customer_property_id', type: 'uuid' })
  customerPropertyId!: string;

  @OneToOne(() => CustomerPropertyEntity, (property) => property.siteActivity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_property_id' })
  customerProperty?: CustomerPropertyEntity;

  // Phase tracking
  @Column({ name: 'is_site_visit_done', type: 'boolean', default: false })
  isSiteVisitDone!: boolean;

  @Column({ name: 'is_site_survey_done', type: 'boolean', default: false })
  isSiteSurveyDone!: boolean;

  @Column({ name: 'completed_by', type: 'uuid', nullable: true })
  completedBy?: string;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  // Visit Data (captured by field worker)
  @Column({ name: 'gps_coordinates', type: 'jsonb', nullable: true })
  gpsCoordinates?: GpsCoordinates;

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

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // Survey Data (captured by surveyor)
  @Column({ name: 'survey_data', type: 'jsonb', nullable: true })
  surveyData?: SurveyData;

  @Column({ name: 'surveyor_id', type: 'uuid', nullable: true })
  surveyorId?: string;

  @ManyToOne(() => UserEntity, { nullable: true, createForeignKeyConstraints: false })
  @JoinColumn({ name: 'surveyor_id' })
  surveyor?: UserEntity;

  // Flexible metadata (visit completion audit, surveyCode from migration, etc.)
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  // Audit
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

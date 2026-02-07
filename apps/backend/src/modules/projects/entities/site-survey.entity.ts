import {
  RoofCondition,
  RoofOrientation,
  SiteSurveyStatus,
  type ElectricalDetails,
  type FileAttachment,
  type ShadingAnalysis,
} from '@oneohm-epc/shared-types';
import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { ProjectEntity } from './project.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Site Survey Entity
 * Represents a pre-installation site assessment
 */
@Entity('site_surveys')
export class SiteSurveyEntity extends BaseEntity {
  // ==================== Relations ====================
  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  @ManyToOne(() => ProjectEntity, (project) => project.surveys, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  @Column({ type: 'uuid', name: 'surveyor_id', nullable: true })
  surveyorId?: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'surveyor_id' })
  surveyor?: UserEntity;

  // ==================== Survey Info ====================
  @Column({ type: 'timestamp', name: 'survey_date' })
  surveyDate!: Date;

  @Column({
    type: 'varchar',
    length: 50,
    default: SiteSurveyStatus.SCHEDULED,
  })
  status!: SiteSurveyStatus;

  // ==================== Roof Details ====================
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'roof_type' })
  roofType?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'roof_condition',
  })
  roofCondition?: RoofCondition;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'roof_orientation',
  })
  roofOrientation?: RoofOrientation;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'roof_tilt_angle' })
  roofTiltAngle?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'available_area_sqm' })
  availableAreaSqm?: number;

  // ==================== Site Analysis ====================
  @Column({ type: 'jsonb', nullable: true, name: 'shading_analysis' })
  shadingAnalysis?: ShadingAnalysis;

  @Column({ type: 'jsonb', nullable: true, name: 'electrical_details' })
  electricalDetails?: ElectricalDetails;

  @Column({ type: 'text', nullable: true, name: 'structural_assessment' })
  structuralAssessment?: string;

  @Column({ type: 'text', nullable: true, name: 'site_access' })
  siteAccess?: string;

  @Column({ type: 'text', nullable: true, name: 'safety_concerns' })
  safetyConcerns?: string;

  @Column({ type: 'text', nullable: true })
  recommendations?: string;

  // ==================== Attachments ====================
  @Column({ type: 'jsonb', nullable: true })
  photos?: FileAttachment[];

  @Column({ type: 'jsonb', nullable: true })
  documents?: FileAttachment[];

  // ==================== Additional Data ====================
  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ==================== Soft Delete ====================
  @DeleteDateColumn({ type: 'timestamp', nullable: true, name: 'deleted_at' })
  deletedAt?: Date;

  // ==================== Audit Fields ====================
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;
}

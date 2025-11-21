import {
  ProjectPriority,
  ProjectStatus,
  type GpsCoordinates,
  type ProjectMetadata,
} from '@oneohm-epc/shared-types';
import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { ProjectMaterialEntity } from './project-material.entity';
import { ProjectMilestoneEntity } from './project-milestone.entity';
import { SiteSurveyEntity } from './site-survey.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CustomerProfileEntity } from '../../customers/entities/customer-profile.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { QuoteEntity } from '../../quotes/entities/quote.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Project Entity
 * Represents a solar installation project from quote acceptance to handover
 */
@Entity('projects')
export class ProjectEntity extends BaseEntity {
  // ==================== Relations ====================
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

  @Column({ type: 'uuid', name: 'quote_id', nullable: true })
  quoteId?: string;

  @ManyToOne(() => QuoteEntity, { nullable: true })
  @JoinColumn({ name: 'quote_id' })
  quote?: QuoteEntity;

  @Column({ type: 'uuid', name: 'customer_id' })
  customerId!: string;

  @ManyToOne(() => CustomerProfileEntity)
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerProfileEntity;

  @Column({ type: 'uuid', name: 'project_manager_id', nullable: true })
  projectManagerId?: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'project_manager_id' })
  projectManager?: UserEntity;

  @Column({ type: 'uuid', name: 'lead_technician_id', nullable: true })
  leadTechnicianId?: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'lead_technician_id' })
  leadTechnician?: UserEntity;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity;

  // Child relations
  @OneToMany(() => ProjectMilestoneEntity, (milestone) => milestone.project)
  milestones!: ProjectMilestoneEntity[];

  @OneToMany(() => SiteSurveyEntity, (survey) => survey.project)
  surveys!: SiteSurveyEntity[];

  @OneToMany(() => ProjectMaterialEntity, (material) => material.project)
  materials!: ProjectMaterialEntity[];

  // ==================== Project Info ====================
  @Column({ type: 'varchar', length: 50, unique: true, name: 'project_number' })
  projectNumber!: string;

  @Column({ type: 'varchar', length: 255, name: 'name' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // ==================== Site Details ====================
  @Column({ type: 'text', name: 'site_address' })
  siteAddress!: string;

  @Column({ type: 'jsonb', name: 'site_coordinates', nullable: true })
  siteCoordinates?: GpsCoordinates;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'system_size_kw' })
  systemSizeKw!: number;

  @Column({ type: 'varchar', length: 50, name: 'project_type' })
  projectType!: string;

  // ==================== Status & Progress ====================
  @Column({
    type: 'varchar',
    length: 50,
    default: ProjectStatus.DRAFT,
  })
  status!: ProjectStatus;

  @Column({
    type: 'varchar',
    length: 20,
    default: ProjectPriority.NORMAL,
  })
  priority!: ProjectPriority;

  @Column({ type: 'int', default: 0, name: 'progress_percentage' })
  progressPercentage!: number;

  // ==================== Dates ====================
  @Column({ type: 'date', nullable: true, name: 'planned_start_date' })
  plannedStartDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'planned_end_date' })
  plannedEndDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'actual_start_date' })
  actualStartDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'actual_end_date' })
  actualEndDate?: Date;

  // ==================== Financials ====================
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'estimated_cost' })
  estimatedCost?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'actual_cost' })
  actualCost?: number;

  // ==================== Additional Data ====================
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: ProjectMetadata;

  // ==================== Soft Delete ====================
  @DeleteDateColumn({ type: 'timestamp', nullable: true, name: 'deleted_at' })
  deletedAt?: Date;
}

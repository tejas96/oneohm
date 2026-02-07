import {
  ProjectPriority,
  ProjectStatus,
  type ProjectMetadata,
} from '@oneohm-epc/shared-types';
import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';

import { ProjectMaterialEntity } from './project-material.entity';
import { ProjectMilestoneEntity } from './project-milestone.entity';
import { ProjectTaskEntity } from './project-task.entity';
import { ProjectTeamMemberEntity } from './project-team-member.entity';
import { SiteSurveyEntity } from './site-survey.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CustomerPropertyEntity } from '../../customers/entities/customer-property.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Project Entity
 * Represents a solar installation project from quote acceptance to handover
 *
 * Note: organizationId, customerId, siteAddress, and siteCoordinates are derived
 * from the required property relation (property.organizationId, property.customerId,
 * property.address, property.locationCoordinates)
 *
 * Business Rule: One Property can have only ONE Project (OneToOne relationship)
 */
@Entity('projects')
export class ProjectEntity extends BaseEntity {
  // ==================== Relations ====================
  @Column({ type: 'uuid', name: 'property_id' })
  propertyId!: string;

  @OneToOne(() => CustomerPropertyEntity, (property) => property.project)
  @JoinColumn({ name: 'property_id' })
  property!: CustomerPropertyEntity;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity;

  @Column({ type: 'uuid', name: 'updated_by', nullable: true })
  updatedBy?: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;

  // Child relations
  @OneToMany(() => ProjectMilestoneEntity, (milestone) => milestone.project)
  milestones!: ProjectMilestoneEntity[];

  @OneToMany(() => ProjectTaskEntity, (task) => task.project)
  tasks!: ProjectTaskEntity[];

  @OneToMany(() => SiteSurveyEntity, (survey) => survey.project)
  surveys!: SiteSurveyEntity[];

  @OneToMany(() => ProjectMaterialEntity, (material) => material.project)
  materials!: ProjectMaterialEntity[];

  @OneToMany(() => ProjectTeamMemberEntity, (teamMember) => teamMember.project)
  teamMembers!: ProjectTeamMemberEntity[];

  // ==================== Project Info ====================
  @Column({ type: 'varchar', length: 50, unique: true, name: 'project_number' })
  projectNumber!: string;

  @Column({ type: 'varchar', length: 255, name: 'name' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // ==================== System Details ====================
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
  @Column({ type: 'date', nullable: true, name: 'start_date' })
  startDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'end_date' })
  endDate?: Date;

  // ==================== Financials ====================
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'estimated_cost' })
  estimatedCost?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'actual_cost' })
  actualCost?: number;

  // ==================== Additional Data ====================
  @Column({ type: 'jsonb', nullable: true })
  metadata?: ProjectMetadata;

  // ==================== Soft Delete ====================
  @DeleteDateColumn({ type: 'timestamp', nullable: true, name: 'deleted_at' })
  deletedAt?: Date;
}

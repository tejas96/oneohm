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
import { QuoteEntity } from '../../quotes/entities/quote.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * ProjectEntity
 * Represents a solar installation project from quote acceptance to handover.
 *
 * Organization, customer, address, and coordinates are derived from the
 * required property relation (OneToOne: one property = one project).
 */
@Entity('projects')
export class ProjectEntity extends BaseEntity {
  // ==================== Identity ====================

  @Column({ type: 'varchar', length: 50, unique: true, name: 'project_number' })
  projectNumber!: string;

  @Column({ type: 'varchar', length: 255, name: 'name' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // ==================== Quote Reference ====================

  @Column({ type: 'uuid', name: 'quote_id' })
  quoteId!: string;

  // ==================== Status & Progress ====================

  @Column({ type: 'varchar', length: 50, default: ProjectStatus.DRAFT })
  status!: ProjectStatus;

  @Column({ type: 'varchar', length: 20, default: ProjectPriority.NORMAL })
  priority!: ProjectPriority;

  @Column({ type: 'int', default: 0, name: 'progress_percentage' })
  progressPercentage!: number;

  // ==================== Dates ====================

  @Column({ type: 'date', nullable: true, name: 'start_date' })
  startDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'end_date' })
  endDate?: Date;

  // ==================== Workflow Configuration ====================

  @Column({ name: 'excluded_step_ids', type: 'uuid', array: true, nullable: true })
  excludedStepIds?: string[];

  @Column({ name: 'default_transitions', type: 'jsonb', nullable: true })
  defaultTransitions?: Record<string, string[]>;

  // ==================== Metadata ====================

  @Column({ type: 'jsonb', nullable: true })
  metadata?: ProjectMetadata;

  // ==================== Ownership / Audit ====================

  @Column({ type: 'uuid', name: 'property_id' })
  propertyId!: string;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy!: string;

  @Column({ type: 'uuid', name: 'updated_by', nullable: true })
  updatedBy?: string;

  @DeleteDateColumn({ type: 'timestamp', nullable: true, name: 'deleted_at' })
  deletedAt?: Date;

  // ==================== Relations ====================

  @OneToOne(() => CustomerPropertyEntity, (property) => property.project)
  @JoinColumn({ name: 'property_id' })
  property!: CustomerPropertyEntity;

  @ManyToOne(() => QuoteEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'quote_id' })
  quote!: QuoteEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;

  @OneToMany(() => ProjectMilestoneEntity, (milestone) => milestone.project)
  milestones!: ProjectMilestoneEntity[];

  @OneToMany(() => ProjectTaskEntity, (task) => task.project)
  tasks!: ProjectTaskEntity[];

  @OneToOne(() => SiteSurveyEntity, (survey) => survey.project)
  survey?: SiteSurveyEntity;

  @OneToMany(() => ProjectMaterialEntity, (material) => material.project)
  materials!: ProjectMaterialEntity[];

  @OneToMany(() => ProjectTeamMemberEntity, (teamMember) => teamMember.project)
  teamMembers!: ProjectTeamMemberEntity[];
}

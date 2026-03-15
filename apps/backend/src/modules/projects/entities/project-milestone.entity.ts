import {
  MilestoneStatus,
  MilestoneType,
  type MilestoneDeliverable,
} from '@oneohm-epc/shared/types';
import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { ProjectEntity } from './project.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Project Milestone Entity
 * Represents a phase or stage in the project execution
 */
@Entity('project_milestones')
export class ProjectMilestoneEntity extends BaseEntity {
  // ==================== Relations ====================
  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  @ManyToOne(() => ProjectEntity, (project) => project.milestones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  @Column({ type: 'uuid', name: 'assigned_to', nullable: true })
  assignedTo?: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignee?: UserEntity;

  // ==================== Human-readable Code ====================
  @Column({ name: 'milestone_code', type: 'varchar', length: 50, nullable: true, unique: true })
  milestoneCode?: string;

  // ==================== Milestone Info ====================
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50, name: 'milestone_type' })
  milestoneType!: MilestoneType;

  @Column({
    type: 'varchar',
    length: 50,
    default: MilestoneStatus.PENDING,
  })
  status!: MilestoneStatus;

  @Column({ type: 'int', name: 'sequence_order' })
  sequenceOrder!: number;

  // ==================== Progress ====================
  @Column({ type: 'int', default: 0, name: 'progress_percentage' })
  progressPercentage!: number;

  // ==================== Dates ====================
  @Column({ type: 'date', nullable: true, name: 'start_date' })
  startDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'end_date' })
  endDate?: Date;

  // ==================== Dependencies & Deliverables ====================
  @Column({ type: 'jsonb', nullable: true })
  dependencies?: string[]; // Array of milestone IDs

  @Column({ type: 'jsonb', nullable: true })
  deliverables?: MilestoneDeliverable[];

  // ==================== Soft Delete ====================
  @DeleteDateColumn({ type: 'timestamp', nullable: true, name: 'deleted_at' })
  deletedAt?: Date;

  // ==================== Audit Fields ====================
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;
}

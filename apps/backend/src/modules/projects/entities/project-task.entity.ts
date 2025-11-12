import {
  TaskPriority,
  TaskStatus,
  TaskType,
  type FileAttachment,
  type TaskChecklist,
} from '@oneohm-epc/shared-types';
import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import { ProjectMilestoneEntity } from './project-milestone.entity';
import { ProjectEntity } from './project.entity';
import { TaskTemplateEntity } from './task-template.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * ProjectTaskEntity
 * Represents individual tasks within project milestones (Jira-style)
 */
@Entity('project_tasks')
@Index(['projectId', 'deletedAt'])
@Index(['milestoneId', 'deletedAt'])
@Index(['assignedToUserId', 'deletedAt'])
@Index(['status', 'deletedAt'])
@Index(['priority', 'deletedAt'])
@Index(['taskTemplateId', 'deletedAt'])
@Index(['plannedStartDate', 'plannedEndDate', 'deletedAt'])
export class ProjectTaskEntity extends BaseEntity {
  // ==================== Relations ====================

  @ManyToOne(() => ProjectEntity, (project) => project.milestones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  @ManyToOne(() => ProjectMilestoneEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'milestone_id' })
  milestone?: ProjectMilestoneEntity;

  @ManyToOne(() => TaskTemplateEntity, (template) => template.tasks, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'task_template_id' })
  template?: TaskTemplateEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'assigned_to_user_id' })
  assignee?: UserEntity;

  // ==================== Foreign Keys ====================

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ name: 'milestone_id', type: 'uuid', nullable: true })
  milestoneId?: string;

  @Column({ name: 'task_template_id', type: 'uuid', nullable: true })
  taskTemplateId?: string;

  @Column({ name: 'assigned_to_user_id', type: 'uuid', nullable: true })
  assignedToUserId?: string;

  // ==================== Task Info ====================

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // ==================== Type & Assignment ====================

  @Column({ type: 'enum', enum: TaskType, nullable: true })
  type?: TaskType;

  @Column({ name: 'assigned_to_department', type: 'varchar', length: 100, nullable: true })
  assignedToDepartment?: string;

  // ==================== Ordering ====================

  @Column({ name: 'sequence_order', type: 'integer' })
  sequenceOrder!: number;

  // ==================== Dates ====================

  @Column({ name: 'planned_start_date', type: 'date', nullable: true })
  plannedStartDate?: Date;

  @Column({ name: 'planned_end_date', type: 'date', nullable: true })
  plannedEndDate?: Date;

  @Column({ name: 'actual_start_date', type: 'date', nullable: true })
  actualStartDate?: Date;

  @Column({ name: 'actual_end_date', type: 'date', nullable: true })
  actualEndDate?: Date;

  // ==================== Status & Priority ====================

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  status!: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority!: TaskPriority;

  // ==================== Dependencies & Parallelism ====================

  @Column({ name: 'depends_on_task_ids', type: 'uuid', array: true, nullable: true })
  dependsOnTaskIds?: string[];

  @Column({ name: 'can_run_parallel', type: 'boolean', default: false })
  canRunParallel!: boolean;

  // ==================== Progress ====================

  @Column({ name: 'completion_percentage', type: 'integer', default: 0 })
  completionPercentage!: number;

  // ==================== Checklist & Attachments ====================

  @Column({ type: 'jsonb', nullable: true })
  checklist?: TaskChecklist;

  @Column({ type: 'jsonb', nullable: true })
  attachments?: FileAttachment[];

  // ==================== Notes ====================

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ==================== Jira-style Fields ====================

  @Column({ name: 'story_points', type: 'integer', nullable: true })
  storyPoints?: number;

  @Column({ type: 'text', array: true, nullable: true })
  labels?: string[];

  @Column({ name: 'estimated_hours', type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedHours?: number;

  @Column({ name: 'logged_hours', type: 'decimal', precision: 10, scale: 2, default: 0 })
  loggedHours!: number;

  @Column({ name: 'watcher_user_ids', type: 'uuid', array: true, nullable: true })
  watcherUserIds?: string[];

  @Column({ name: 'blocked_reason', type: 'text', nullable: true })
  blockedReason?: string;

  // ==================== Soft Delete ====================

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp with time zone' })
  deletedAt?: Date;

  // ==================== Audit Fields ====================

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;
}


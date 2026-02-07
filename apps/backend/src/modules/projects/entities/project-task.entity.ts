import {
  TaskPriority,
  TaskStatus,
  type FileAttachment,
  type TaskActivityEntry,
  type TaskChecklist,
} from '@oneohm-epc/shared-types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { ProjectMilestoneEntity } from './project-milestone.entity';
import { ProjectEntity } from './project.entity';
import { TaskTemplateEntity } from './task-template.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * ProjectTaskEntity
 * Represents individual tasks within project milestones (Kanban-style)
 */
@Entity('project_tasks')
@Index(['projectId', 'deletedAt'])
@Index(['milestoneId', 'deletedAt'])
@Index(['assignedToUserId', 'deletedAt'])
@Index(['status', 'deletedAt'])
@Index(['priority', 'deletedAt'])
@Index(['taskTemplateId', 'deletedAt'])
export class ProjectTaskEntity extends BaseEntity {
  // ==================== Relations ====================

  @ManyToOne(() => ProjectEntity, (project) => project.tasks, {
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

  // ==================== Ordering ====================

  @Column({ name: 'kanban_order', type: 'integer', default: 1000 })
  kanbanOrder!: number;

  // ==================== Dates ====================

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: Date;

  // ==================== Status & Priority ====================

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.BACKLOG,
  })
  status!: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority!: TaskPriority;

  // ==================== Dependencies ====================

  @Column({ name: 'depends_on_task_ids', type: 'uuid', array: true, nullable: true })
  dependsOnTaskIds?: string[];

  // ==================== Progress ====================

  @Column({ name: 'completion_percentage', type: 'integer', default: 0 })
  completionPercentage!: number;

  // ==================== Checklist & Attachments ====================

  @Column({ type: 'jsonb', nullable: true })
  checklist?: TaskChecklist;

  @Column({ type: 'jsonb', nullable: true })
  attachments?: FileAttachment[];

  // ==================== Jira-style Fields ====================

  @Column({ type: 'text', array: true, nullable: true })
  labels?: string[];

  @Column({ name: 'watcher_user_ids', type: 'uuid', array: true, nullable: true })
  watcherUserIds?: string[];

  @Column({ name: 'blocked_reason', type: 'text', nullable: true })
  blockedReason?: string;

  // ==================== Activity Log ====================

  @Column({ name: 'activity_log', type: 'jsonb', default: [] })
  activityLog!: TaskActivityEntry[];

  // ==================== Optimistic Locking ====================

  @Column({ type: 'integer', default: 1 })
  version!: number;

  // ==================== Soft Delete ====================

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp with time zone' })
  deletedAt?: Date;

  // ==================== Audit Fields ====================

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;
}

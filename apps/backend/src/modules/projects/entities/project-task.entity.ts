import {
  TaskPriority,
  TaskStatus,
  type FileAttachment,
  type TaskActivityEntry,
  type TaskChecklist,
} from '@oneohm-epc/shared/types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { ProjectEntity } from './project.entity';
import { WorkflowStepEntity } from './workflow-step.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('project_tasks')
@Index(['projectId', 'deletedAt'])
@Index(['assignedToUserId', 'deletedAt'])
@Index(['status', 'deletedAt'])
@Index(['priority', 'deletedAt'])
@Index(['workflowStepId', 'deletedAt'])
export class ProjectTaskEntity extends BaseEntity {
  // ==================== Relations ====================

  @ManyToOne(() => ProjectEntity, (project) => project.tasks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  @ManyToOne(() => WorkflowStepEntity, (step) => step.tasks, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'workflow_step_id' })
  workflowStep?: WorkflowStepEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'assigned_to_user_id' })
  assignee?: UserEntity;

  // ==================== Foreign Keys ====================

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ name: 'workflow_step_id', type: 'uuid', nullable: true })
  workflowStepId?: string;

  @Column({ name: 'assigned_to_user_id', type: 'uuid', nullable: true })
  assignedToUserId?: string;

  // ==================== Milestone ====================

  @Column({ name: 'milestone_name', type: 'varchar', length: 255, nullable: true })
  milestoneName?: string | null;

  @Column({ name: 'milestone_order', type: 'integer', nullable: true })
  milestoneOrder?: number | null;

  // ==================== Task Info ====================

  @Column({ type: 'varchar', length: 255, nullable: true })
  name?: string | null;

  @Column({ type: 'varchar', length: 100 })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // ==================== Override Columns ====================

  @Column({ name: 'name_override', type: 'varchar', length: 255, nullable: true })
  nameOverride?: string;

  @Column({ name: 'description_override', type: 'text', nullable: true })
  descriptionOverride?: string;

  @Column({ name: 'checklist_override', type: 'jsonb', nullable: true })
  checklistOverride?: TaskChecklist;

  @Column({ name: 'labels_override', type: 'text', array: true, nullable: true })
  labelsOverride?: string[];

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

import { type MilestoneType, type TaskChecklist } from '@oneohm-epc/shared-types';
import { Column, DeleteDateColumn, Entity, Index, OneToMany } from 'typeorm';

import { ProjectTaskEntity } from './project-task.entity';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * TaskTemplateEntity
 * Represents reusable task templates for standardizing workflows
 */
@Entity('task_templates')
@Index(['organizationId', 'deletedAt'])
@Index(['isActive', 'deletedAt'])
export class TaskTemplateEntity extends BaseEntity {
  // ==================== Relations ====================

  @OneToMany(() => ProjectTaskEntity, (task) => task.template)
  tasks!: ProjectTaskEntity[];

  // ==================== Foreign Keys ====================

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  // ==================== Template Info ====================

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // ==================== Task Configuration ====================

  @Column({ type: 'varchar', length: 50, nullable: true })
  type?: string;

  @Column({ name: 'default_department', type: 'varchar', length: 100, nullable: true })
  defaultDepartment?: string;

  @Column({ name: 'default_role_code', type: 'varchar', length: 50, nullable: true })
  defaultRoleCode?: string;

  @Column({ name: 'default_milestone_type', type: 'varchar', length: 50, nullable: true })
  defaultMilestoneType?: MilestoneType;

  @Column({ name: 'sequence_order', type: 'integer' })
  sequenceOrder!: number;

  // ==================== Behavior ====================

  @Column({ name: 'is_mandatory', type: 'boolean', default: true })
  isMandatory!: boolean;

  @Column({ name: 'can_run_parallel', type: 'boolean', default: false })
  canRunParallel!: boolean;

  @Column({ name: 'depends_on_task_codes', type: 'text', array: true, nullable: true })
  dependsOnTaskCodes?: string[];

  // ==================== Estimation ====================

  @Column({ name: 'estimated_duration_hours', type: 'integer', nullable: true })
  estimatedDurationHours?: number;

  // ==================== Checklist Template ====================

  @Column({ name: 'checklist_template', type: 'jsonb', nullable: true })
  checklistTemplate?: TaskChecklist;

  // ==================== Status ====================

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  // ==================== Soft Delete ====================

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp with time zone' })
  deletedAt?: Date;

  // ==================== Audit Fields ====================

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;
}

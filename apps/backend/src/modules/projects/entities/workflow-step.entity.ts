import { type MilestoneType, type TaskChecklist } from '@oneohm-epc/shared/types';
import { Column, DeleteDateColumn, Entity, Index, OneToMany } from 'typeorm';

import { ProjectTaskEntity } from './project-task.entity';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('workflow_steps')
@Index(['organizationId', 'deletedAt'])
@Index(['isActive', 'deletedAt'])
export class WorkflowStepEntity extends BaseEntity {
  @OneToMany(() => ProjectTaskEntity, (task) => task.workflowStep)
  tasks!: ProjectTaskEntity[];

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

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

  @Column({ name: 'is_mandatory', type: 'boolean', default: true })
  isMandatory!: boolean;

  @Column({ name: 'can_run_parallel', type: 'boolean', default: false })
  canRunParallel!: boolean;

  @Column({ name: 'depends_on_task_codes', type: 'text', array: true, nullable: true })
  dependsOnTaskCodes?: string[];

  @Column({ name: 'estimated_duration_hours', type: 'integer', nullable: true })
  estimatedDurationHours?: number;

  @Column({ name: 'checklist_template', type: 'jsonb', nullable: true })
  checklistTemplate?: TaskChecklist;

  @Column({ name: 'allowed_transitions', type: 'jsonb', nullable: true })
  allowedTransitions?: Record<string, string[]>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp with time zone' })
  deletedAt?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;
}

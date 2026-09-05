import { type TaskChecklist, ChangeRequestType, WorkflowStepType } from '@tejas96/shared/types';
import { Column, DeleteDateColumn, Entity, Index, OneToMany } from 'typeorm';

import { ProjectTaskEntity } from './project-task.entity';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('workflow_steps')
@Index(['deletedAt'])
@Index(['isActive', 'deletedAt'])
export class WorkflowStepEntity extends BaseEntity {
  @OneToMany(() => ProjectTaskEntity, (task) => task.workflowStep)
  tasks!: ProjectTaskEntity[];

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  type?: WorkflowStepType | null;

  @Column({ name: 'default_department', type: 'varchar', length: 100, nullable: true })
  defaultDepartment?: string;

  @Column({ name: 'default_role_code', type: 'varchar', length: 50, nullable: true })
  defaultRoleCode?: string;

  @Column({ name: 'default_milestone_name', type: 'varchar', length: 255, nullable: true })
  defaultMilestoneName?: string | null;

  @Column({ name: 'default_milestone_order', type: 'integer', nullable: true })
  defaultMilestoneOrder?: number | null;

  @Column({ name: 'sequence_order', type: 'integer' })
  sequenceOrder!: number;

  @Column({ name: 'is_mandatory', type: 'boolean', default: true })
  isMandatory!: boolean;

  @Column({ name: 'can_run_parallel', type: 'boolean', default: false })
  canRunParallel!: boolean;

  @Column({ name: 'depends_on_task_codes', type: 'text', array: true, nullable: true })
  dependsOnTaskCodes?: string[];

  @Column({ name: 'effort_days', type: 'integer', nullable: true })
  effortDays?: number;

  @Column({ name: 'checklist_template', type: 'jsonb', nullable: true })
  checklistTemplate?: TaskChecklist;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'is_special', type: 'boolean', default: false })
  isSpecial!: boolean;

  @Column({ name: 'change_request_type', type: 'varchar', length: 50, nullable: true })
  changeRequestType?: ChangeRequestType | null;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp with time zone' })
  deletedAt?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;
}

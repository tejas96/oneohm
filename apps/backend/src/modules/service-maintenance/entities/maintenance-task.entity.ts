import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { MaintenanceTaskStatus } from '@oneohm-epc/shared-types';

import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { ProjectMaintenanceConfigEntity } from './project-maintenance-config.entity';

/**
 * Maintenance Task Entity
 * Schema: Lines 1602-1656
 */
@Entity('maintenance_tasks')
export class MaintenanceTaskEntity extends BaseEntity {
  // ============================================
  // RELATIONS
  // ============================================

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  organization: OrganizationEntity;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => ProjectEntity)
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @ManyToOne(() => ProjectMaintenanceConfigEntity, (config) => config.tasks)
  @JoinColumn({ name: 'maintenance_config_id' })
  maintenanceConfig: ProjectMaintenanceConfigEntity;

  @Column({ name: 'maintenance_config_id', type: 'uuid' })
  maintenanceConfigId: string;

  // ============================================
  // TASK INFO
  // ============================================

  @Column({ name: 'task_name', type: 'varchar', length: 255 })
  taskName: string;

  @Column({ name: 'task_code', type: 'varchar', length: 100, nullable: true })
  taskCode: string | null;

  @Column({ name: 'interval_number', type: 'integer' })
  intervalNumber: number;

  // ============================================
  // SCHEDULE
  // ============================================

  @Column({ name: 'scheduled_date', type: 'date' })
  scheduledDate: Date;

  @Column({ name: 'completed_date', type: 'date', nullable: true })
  completedDate: Date | null;

  // ============================================
  // ASSIGNMENT
  // ============================================

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'assigned_to_user_id' })
  assignedToUser: UserEntity;

  @Column({ name: 'assigned_to_user_id', type: 'uuid', nullable: true })
  assignedToUserId: string | null;

  @Column({
    name: 'assigned_to_department',
    type: 'varchar',
    length: 100,
    default: 'service',
  })
  assignedToDepartment: string;

  @Column({ name: 'assigned_at', type: 'timestamptz', nullable: true })
  assignedAt: Date | null;

  // ============================================
  // STATUS
  // ============================================

  @Column({
    type: 'varchar',
    length: 50,
    default: MaintenanceTaskStatus.SCHEDULED,
  })
  status: MaintenanceTaskStatus;

  // ============================================
  // CHECKLIST
  // ============================================

  /**
   * Checklist (JSONB)
   * Example: [
   *   { item: "Check panel condition", completed: true, completedAt: "2024-01-15" },
   *   { item: "Test inverter", completed: false }
   * ]
   */
  @Column({ type: 'jsonb', nullable: true })
  checklist: Array<{
    item: string;
    completed: boolean;
    completedAt?: string;
    notes?: string;
  }> | null;

  // ============================================
  // FINDINGS
  // ============================================

  @Column({ type: 'text', nullable: true })
  findings: string | null;

  @Column({ name: 'issues_found', type: 'text', nullable: true })
  issuesFound: string | null;

  @Column({ name: 'actions_taken', type: 'text', nullable: true })
  actionsTaken: string | null;

  // ============================================
  // ATTACHMENTS
  // ============================================

  /**
   * Attachments (JSONB)
   * Example: [
   *   { fileName: "report.pdf", filePath: "/uploads/report.pdf", fileSize: 1024 }
   * ]
   */
  @Column({ type: 'jsonb', nullable: true })
  attachments: Array<{
    fileName: string;
    filePath: string;
    fileSize?: number;
    mimeType?: string;
  }> | null;

  // ============================================
  // NOTES
  // ============================================

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // ============================================
  // AUDIT
  // ============================================

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: UserEntity;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: UserEntity;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;
}


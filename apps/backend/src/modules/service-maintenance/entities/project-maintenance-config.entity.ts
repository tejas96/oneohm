import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { MaintenanceConfigStatus } from '@oneohm-epc/shared-types';

import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { MaintenanceTaskEntity } from './maintenance-task.entity';

/**
 * Project Maintenance Config Entity
 * Schema: Lines 1567-1600
 */
@Entity('project_maintenance_configs')
export class ProjectMaintenanceConfigEntity extends BaseEntity {
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

  @Column({ name: 'project_id', type: 'uuid', unique: true })
  projectId: string;

  // ============================================
  // MAINTENANCE SETTINGS
  // ============================================

  @Column({ name: 'is_maintenance_enabled', type: 'boolean', default: true })
  isMaintenanceEnabled: boolean;

  @Column({ name: 'maintenance_years', type: 'integer' })
  maintenanceYears: number;

  /**
   * Intervals Configuration (JSONB)
   * Example: [
   *   { intervalNumber: 1, months: 3, taskName: "First Checkup" },
   *   { intervalNumber: 2, months: 6, taskName: "Second Checkup" }
   * ]
   */
  @Column({ type: 'jsonb' })
  intervals: Array<{
    intervalNumber: number;
    months: number;
    taskName: string;
    description?: string;
  }>;

  // ============================================
  // TRACKING
  // ============================================

  @Column({ name: 'project_completion_date', type: 'date', nullable: true })
  projectCompletionDate: Date | null;

  @Column({ name: 'last_maintenance_date', type: 'date', nullable: true })
  lastMaintenanceDate: Date | null;

  @Column({ name: 'next_maintenance_due_date', type: 'date', nullable: true })
  nextMaintenanceDueDate: Date | null;

  // ============================================
  // STATUS
  // ============================================

  @Column({
    type: 'varchar',
    length: 50,
    default: MaintenanceConfigStatus.ACTIVE,
  })
  status: MaintenanceConfigStatus;

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

  // ============================================
  // REVERSE RELATIONS
  // ============================================

  @OneToMany(() => MaintenanceTaskEntity, (task) => task.maintenanceConfig)
  tasks: MaintenanceTaskEntity[];
}


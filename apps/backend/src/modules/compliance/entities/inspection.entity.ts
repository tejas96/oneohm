import { InspectionStatus } from '@oneohm-epc/shared-types';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Inspection Entity
 * Schema: Lines 1926-1973
 */
@Entity('inspections')
@Index(['projectId'])
@Index(['inspectionType'])
@Index(['status'])
@Index(['scheduledDate'])
export class InspectionEntity extends BaseEntity {
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

  // ============================================
  // INSPECTION INFO
  // ============================================

  @Column({ name: 'inspection_type', type: 'varchar', length: 100 })
  inspectionType: string;

  @Column({ name: 'inspection_number', type: 'varchar', length: 50, unique: true })
  inspectionNumber: string;

  // ============================================
  // SCHEDULE
  // ============================================

  @Column({ name: 'scheduled_date', type: 'date' })
  scheduledDate: Date;

  @Column({ name: 'actual_date', type: 'date', nullable: true })
  actualDate: Date | null;

  // ============================================
  // INSPECTOR
  // ============================================

  @Column({ name: 'inspector_name', type: 'varchar', length: 255, nullable: true })
  inspectorName: string | null;

  @Column({ name: 'inspector_organization', type: 'varchar', length: 255, nullable: true })
  inspectorOrganization: string | null;

  @Column({ name: 'inspector_contact', type: 'varchar', length: 100, nullable: true })
  inspectorContact: string | null;

  // ============================================
  // STATUS
  // ============================================

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'scheduled' })
  status: InspectionStatus;

  // ============================================
  // RESULTS
  // ============================================

  @Column({ name: 'inspection_report', type: 'text', nullable: true })
  inspectionReport: string | null;

  @Column({ name: 'issues_found', type: 'text', nullable: true })
  issuesFound: string | null;

  @Column({ name: 'corrective_actions', type: 'text', nullable: true })
  correctiveActions: string | null;

  // ============================================
  // DOCUMENTS
  // ============================================

  @Column({ name: 'report_file_path', type: 'text', nullable: true })
  reportFilePath: string | null;

  @Column({ name: 'photos', type: 'jsonb', nullable: true })
  photos: Record<string, unknown> | null;

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


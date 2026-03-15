import { SiteSurveyStatus, type FileAttachment, type SurveyData } from '@oneohm-epc/shared/types';
import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';

import { ProjectEntity } from './project.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Site Survey Entity
 * Represents a pre-installation site assessment (one-to-one with project)
 */
@Entity('site_surveys')
export class SiteSurveyEntity extends BaseEntity {
  // ==================== Relations ====================

  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  @OneToOne(() => ProjectEntity, (project) => project.survey, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  @Column({ type: 'uuid', name: 'surveyor_id', nullable: true })
  surveyorId?: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'surveyor_id' })
  surveyor?: UserEntity;

  // ==================== Human-readable Code ====================

  @Column({ name: 'survey_code', type: 'varchar', length: 50, nullable: true, unique: true })
  surveyCode?: string;

  // ==================== Status ====================

  @Column({
    type: 'varchar',
    length: 50,
    default: SiteSurveyStatus.SCHEDULED,
  })
  status!: SiteSurveyStatus;

  // ==================== Survey Assessment Data (JSONB) ====================

  @Column({ type: 'jsonb', nullable: true, name: 'survey_data' })
  surveyData?: SurveyData;

  // ==================== Attachments ====================

  @Column({ type: 'jsonb', nullable: true })
  documents?: FileAttachment[];

  // ==================== Soft Delete ====================

  @DeleteDateColumn({ type: 'timestamp', nullable: true, name: 'deleted_at' })
  deletedAt?: Date;

  // ==================== Audit Fields ====================

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;
}

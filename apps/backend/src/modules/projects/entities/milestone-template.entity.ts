import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { TaskTemplateEntity } from './task-template.entity';

/**
 * MilestoneTemplateEntity
 * 
 * Represents reusable milestone templates for standardizing project workflows.
 * Templates can be applied when creating new projects to speed up setup.
 * 
 * Schema: Lines 2125-2167
 */
@Entity('milestone_templates')
@Index('idx_milestone_templates_org', ['organizationId'], { where: '"deleted_at" IS NULL' })
@Index('idx_milestone_templates_type', ['type'], { where: '"is_active" = TRUE' })
export class MilestoneTemplateEntity extends BaseEntity {
  // ============================================
  // RELATIONS
  // ============================================

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;

  // ============================================
  // FOREIGN KEYS
  // ============================================

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  // ============================================
  // TEMPLATE INFO
  // ============================================

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // ============================================
  // MILESTONE TYPE
  // ============================================

  @Column({ type: 'varchar', length: 50 })
  type: string;

  // ============================================
  // PAYMENT CONFIGURATION
  // ============================================

  @Column({ name: 'requires_payment', type: 'boolean', default: false })
  requiresPayment: boolean;

  @Column({ name: 'default_payment_percentage', type: 'decimal', precision: 5, scale: 2, nullable: true })
  defaultPaymentPercentage: number | null;

  // ============================================
  // WORKFLOW
  // ============================================

  @Column({ name: 'sequence_order', type: 'integer' })
  sequenceOrder: number;

  @Column({ name: 'is_mandatory', type: 'boolean', default: true })
  isMandatory: boolean;

  @Column({ name: 'can_skip', type: 'boolean', default: false })
  canSkip: boolean;

  // ============================================
  // DEPENDENCIES
  // ============================================

  @Column({ name: 'depends_on_milestone_codes', type: 'text', array: true, nullable: true })
  dependsOnMilestoneCodes: string[] | null;

  // ============================================
  // DURATION
  // ============================================

  @Column({ name: 'estimated_duration_days', type: 'integer', nullable: true })
  estimatedDurationDays: number | null;

  // ============================================
  // STATUS
  // ============================================

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // ============================================
  // SOFT DELETE
  // ============================================

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp with time zone' })
  deletedAt: Date | null;

  // ============================================
  // AUDIT FIELDS
  // ============================================

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;
}


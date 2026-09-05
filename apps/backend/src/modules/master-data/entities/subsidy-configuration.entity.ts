import { SubsidySchemeType, ProjectType, type SubsidyTier } from '@tejas96/shared/types';
import { Column, DeleteDateColumn, Entity, Index } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Subsidy Configuration Entity
 * Stores government subsidy schemes and their calculation rules
 *
 * Example: PM Surya Ghar scheme for residential projects
 * - Max 3KW eligible for subsidy
 * - Requires DCR panels
 * - Tiered rates: 0-2KW @ ₹30,000/KW, 2-3KW @ ₹18,000/KW
 *
 * @example
 * {
 *   schemeName: "PM Surya Ghar - Residential",
 *   schemeCode: "PM-SURYA-RES",
 *   schemeType: "pm_surya_ghar",
 *   projectType: "residential",
 *   maxSubsidyKw: 3,
 *   maxSubsidyAmount: 78000,
 *   requiresDcr: true,
 *   tiers: [
 *     { fromKw: 0, toKw: 2, ratePerKw: 30000 },
 *     { fromKw: 2, toKw: 3, ratePerKw: 18000 }
 *   ]
 * }
 */
@Entity('subsidy_configurations')
@Index(['projectType', 'isActive'])
// Note: Unique index on (scheme_code) is created via migration
// as a partial index (WHERE scheme_code IS NOT NULL) since scheme_code is nullable
@Index(['schemeType', 'isActive'])
export class SubsidyConfiguration extends BaseEntity {
  // ==================== Foreign Keys ====================

  /**
   * Organization this configuration belongs to
   */

  // ==================== Identity ====================

  /**
   * Scheme name for display
   * Example: "PM Surya Ghar", "State Subsidy Maharashtra"
   */
  @Column({ type: 'varchar', length: 100, name: 'scheme_name' })
  schemeName!: string;

  /**
   * Unique scheme code
   * Example: "PM-SURYA-RES", "MH-STATE-SUBSIDY"
   */
  @Column({ type: 'varchar', length: 50, name: 'scheme_code', nullable: true })
  schemeCode?: string;

  /**
   * Type of subsidy scheme
   */
  @Column({
    type: 'varchar',
    length: 30,
    name: 'scheme_type',
    default: SubsidySchemeType.PM_SURYA_GHAR,
  })
  schemeType!: SubsidySchemeType;

  // ==================== Eligibility ====================

  /**
   * Project type this subsidy applies to
   */
  @Column({
    type: 'varchar',
    length: 30,
    name: 'project_type',
  })
  projectType!: ProjectType;

  /**
   * Maximum system size (in KW) eligible for subsidy
   * For PM Surya Ghar: 3KW for residential, 500KW for apartments
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'max_subsidy_kw',
  })
  maxSubsidyKw!: number;

  /**
   * Maximum subsidy amount (cap) in INR
   * Example: 78000 for residential
   */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'max_subsidy_amount',
    nullable: true,
  })
  maxSubsidyAmount?: number;

  /**
   * Whether DCR (Domestic Content Requirement) panels are required
   */
  @Column({
    type: 'boolean',
    name: 'requires_dcr',
    default: true,
  })
  requiresDcr!: boolean;

  // ==================== Calculation ====================

  /**
   * Tiered subsidy rates (JSONB)
   *
   * Example:
   * [
   *   { fromKw: 0, toKw: 2, ratePerKw: 30000 },
   *   { fromKw: 2, toKw: 3, ratePerKw: 18000 }
   * ]
   */
  @Column({
    type: 'jsonb',
    name: 'tiers',
    default: '[]',
  })
  tiers!: SubsidyTier[];

  // ==================== Status ====================

  /**
   * Whether this configuration is currently active
   * Only one config should be active per org + project_type
   */
  @Column({
    type: 'boolean',
    name: 'is_active',
    default: true,
  })
  isActive!: boolean;

  // ==================== Metadata ====================

  /**
   * Optional description/notes
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  /**
   * Date from which this configuration is effective
   */
  @Column({
    type: 'date',
    name: 'effective_from',
    nullable: true,
  })
  effectiveFrom?: Date | null;

  /**
   * Date until which this configuration is effective
   */
  @Column({
    type: 'date',
    name: 'effective_to',
    nullable: true,
  })
  effectiveTo?: Date | null;

  // ==================== Audit ====================

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ type: 'uuid', name: 'updated_by', nullable: true })
  updatedBy?: string;

  // ==================== Relationships ====================
}

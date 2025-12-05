import { SubsidySchemeType, ProjectType, type SubsidyTier } from '@oneohm-epc/shared-types';
import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';

/**
 * Subsidy Configuration Entity
 * Stores government subsidy schemes and their calculation rules
 *
 * Example: PM Surya Ghar scheme for residential projects
 * - Max 3KW eligible for subsidy
 * - Requires DCR panels
 * - Tiered rates: 0-2KW @ ₹30,000/KW, 2-3KW @ ₹18,000/KW
 */
@Entity('subsidy_configurations')
@Index(['organizationId', 'projectType', 'isActive'])
@Index(['schemeType', 'isActive'])
export class SubsidyConfiguration extends BaseEntity {
  /**
   * Organization this configuration belongs to
   */
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: OrganizationEntity;

  /**
   * Scheme name for display
   * Example: "PM Surya Ghar", "State Subsidy Maharashtra"
   */
  @Column({ type: 'varchar', length: 100, name: 'scheme_name' })
  schemeName: string;

  /**
   * Type of subsidy scheme
   */
  @Column({
    type: 'enum',
    enum: SubsidySchemeType,
    name: 'scheme_type',
    default: SubsidySchemeType.PM_SURYA_GHAR,
  })
  schemeType: SubsidySchemeType;

  /**
   * Project type this subsidy applies to
   */
  @Column({
    type: 'enum',
    enum: ProjectType,
    name: 'project_type',
  })
  projectType: ProjectType;

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
  maxSubsidyKw: number;

  /**
   * Whether DCR (Domestic Content Requirement) panels are required
   */
  @Column({
    type: 'boolean',
    name: 'requires_dcr',
    default: true,
  })
  requiresDcr: boolean;

  /**
   * Whether to automatically split system into DCR + Non-DCR
   * if system size exceeds max_subsidy_kw
   *
   * Example: 6KW system → 3KW DCR (with subsidy) + 3KW Non-DCR
   */
  @Column({
    type: 'boolean',
    name: 'auto_split_enabled',
    default: true,
  })
  autoSplitEnabled: boolean;

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
  tiers: SubsidyTier[];

  /**
   * Whether this configuration is currently active
   * Only one config should be active per org + project_type
   */
  @Column({
    type: 'boolean',
    name: 'is_active',
    default: true,
  })
  isActive: boolean;

  /**
   * Optional description/notes
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  description: string | null;

  /**
   * Date from which this configuration is effective
   */
  @Column({
    type: 'date',
    name: 'effective_from',
    nullable: true,
  })
  effectiveFrom: Date | null;

  /**
   * Date until which this configuration is effective
   */
  @Column({
    type: 'date',
    name: 'effective_to',
    nullable: true,
  })
  effectiveTo: Date | null;
}
